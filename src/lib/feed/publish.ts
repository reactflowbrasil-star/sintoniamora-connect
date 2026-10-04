import { describeRegistrationFailure, mediaFailureMessage, newObjectId } from "@/lib/media";
import { removeUpload, rest, upload } from "@/lib/supabase";

/**
 * Publicação no feed, compartilhada entre o compositor de `/feed` e o estúdio de
 * captura do `/dashboard`.
 *
 * Antes cada tela tinha a sua cópia do mesmo caminho: validar, enviar para o
 * storage, registrar em `post_media` e, em qualquer falha, apagar o post e os
 * arquivos já enviados. Manter isso em um lugar só é o que garante que uma
 * foto tirada pela câmera e um arquivo escolhido no disco funcionem igual.
 */

export type FeedAudience = "PUBLIC" | "FOLLOWERS";

export const MAX_MEDIA_PER_POST = 4;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Espelha `allowed_mime_types` do bucket `post-media` e o `accept` do composer. */
export const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_MEDIA_TYPES.join(",");

/** A câmera e a gravação produzem JPEG e WEBM, ambos aceitos pelo bucket. */
export const CAPTURED_PHOTO_TYPE = "image/jpeg";

export type PostMediaDraft = {
  object_path: string;
  media_type: "photo" | "video";
  mime_type: string;
  size_bytes: number;
};

export function mediaKind(file: File): "photo" | "video" | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "photo";
  return null;
}

/** Human-readable reason the file cannot be published, or "" when it can. */
export function validateMedia(file: File): string {
  const kind = mediaKind(file);
  if (!kind) return `${file.name}: formato não permitido.`;
  if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: formato não permitido.`;
  }
  if (file.size === 0) return `${file.name}: o arquivo está vazio.`;
  const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (file.size > limit) {
    return `${file.name}: o limite é ${kind === "video" ? "50 MB para vídeo" : "10 MB para foto"}.`;
  }
  return "";
}

function extensionFor(file: File, kind: "photo" | "video"): string {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  return kind === "video" ? "webm" : "jpg";
}

export type PublishInput = {
  authorId: string;
  body: string;
  audience: FeedAudience;
  files: File[];
};

/**
 * Creates the post, uploads each file and registers its metadata.
 *
 * On any failure everything created in this call is removed again — a post
 * whose media never arrived would render as an empty card for everybody else.
 */
export async function publishPost({ authorId, body, audience, files }: PublishInput): Promise<{
  postId: string;
  mediaCount: number;
}> {
  const text = body.trim();
  if (!text && files.length === 0) {
    throw new Error("Escreva algo ou anexe uma foto ou vídeo antes de publicar.");
  }
  if (files.length > MAX_MEDIA_PER_POST) {
    throw new Error(`Escolha até ${MAX_MEDIA_PER_POST} fotos ou vídeos por publicação.`);
  }
  for (const file of files) {
    const problem = validateMedia(file);
    if (problem) throw new Error(problem);
  }

  const created = await rest<{ id: string }[]>("posts", "select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      author_id: authorId,
      body: text || "📷 Mídia compartilhada",
      audience,
    }),
  });
  const postId = created?.[0]?.id ?? "";
  if (!postId) throw new Error("O servidor não confirmou a publicação.");

  const uploaded: string[] = [];
  const metadata: Array<PostMediaDraft & { post_id: string; owner_id: string }> = [];
  try {
    for (const file of files) {
      const kind = mediaKind(file) ?? "photo";
      const objectPath = `${authorId}/${postId}/${newObjectId()}.${extensionFor(file, kind)}`;
      try {
        await upload(objectPath, file, "post-media");
      } catch (cause) {
        throw new Error(mediaFailureMessage(cause, `${file.name}: falha no envio do arquivo.`));
      }
      uploaded.push(objectPath);
      metadata.push({
        post_id: postId,
        owner_id: authorId,
        object_path: objectPath,
        media_type: kind,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }
    if (metadata.length) {
      try {
        await rest("post_media", "", { method: "POST", body: JSON.stringify(metadata) });
      } catch (cause) {
        throw new Error(describeRegistrationFailure(cause, "post"));
      }
    }
    return { postId, mediaCount: metadata.length };
  } catch (cause) {
    await rest("posts", `id=eq.${postId}&author_id=eq.${authorId}`, {
      method: "DELETE",
    }).catch(() => undefined);
    await Promise.all(uploaded.map((path) => removeUpload(path, "post-media").catch(() => undefined)));
    throw cause;
  }
}