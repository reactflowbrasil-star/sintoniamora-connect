import { isMissingBackendObject, isNetworkFailure, rest } from "@/lib/supabase";

/**
 * Upload helpers shared by the profile gallery (`/perfil`) and the feed
 * composer (`/feed`).
 *
 * Both flows run the same steps — store the object, register it in the database,
 * refresh the view — and both used to show whatever the browser happened to
 * say. Chrome collapses every network-level problem into "Failed to fetch",
 * which is why an upload blocked by a missing RPC looked like a broken
 * connection. These helpers name the actual cause.
 */

/** `crypto.randomUUID` only exists in a secure context; plain HTTP is not one. */
export function newObjectId(): string {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === "function") source.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The metadata table/RPC the caller needs, so the message names the right fix. */
export type MediaRegistration = "profile" | "post";

const MISSING_BACKEND: Record<MediaRegistration, string> = {
  profile:
    "O arquivo chegou ao servidor, mas o registro da mídia foi recusado porque a tabela profile_media não existe no banco. Aplique supabase/migrations/20261003040000_repair_missing_backend.sql no SQL Editor do Supabase e envie o arquivo novamente.",
  post:
    "O arquivo chegou ao servidor, mas o registro da mídia foi recusado porque a tabela post_media ou a permissão correspondente não está disponível. Aplique supabase/migrations/20261003040000_repair_missing_backend.sql no SQL Editor do Supabase e tente de novo.",
};

/** Postgres `42501`: a linha foi barrada pela RLS, não por falta de coluna. */
export function isRowSecurityRejection(cause: unknown): boolean {
  const code = cause instanceof Error ? (cause as Error & { code?: string }).code : undefined;
  if (code === "42501") return true;
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  return /row-level security|row level security/i.test(message);
}

export function mediaFailureMessage(cause: unknown, fallback: string): string {
  if (isMissingBackendObject(cause)) {
    return "Este projeto ainda está sem a camada de registro de mídia. Aplique supabase/migrations/20261003040000_repair_missing_backend.sql no SQL Editor do Supabase e tente novamente.";
  }
  if (isRowSecurityRejection(cause)) {
    return (
      "O banco recusou a gravação da mídia pela política de segurança (RLS). Isso acontece com conta suspensa, " +
      "sessão expirada ou quando a camada de migração não está aplicada. Entre novamente e, se persistir, " +
      "aplique supabase/migrations/20261003040000_repair_missing_backend.sql no SQL Editor do Supabase."
    );
  }
  if (isNetworkFailure(cause)) {
    return (
      "A conexão com o servidor de mídia foi interrompida antes da resposta (" +
      "o navegador só reporta \"Failed to fetch\"). Verifique a internet, desative VPN ou proxy, " +
      "confirme que o site está em HTTPS e tente de novo. Se o arquivo for muito grande, " +
      "envie uma versão menor."
    );
  }
  return cause instanceof Error ? cause.message : fallback;
}

/** Same as {@link mediaFailureMessage} but naming the registration that failed. */
export function describeRegistrationFailure(cause: unknown, registration: MediaRegistration): string {
  if (isMissingBackendObject(cause)) return MISSING_BACKEND[registration];
  return mediaFailureMessage(cause, "Não foi possível registrar a mídia enviada.");
}

/**
 * Registra uma mídia da galeria do perfil em `public.profile_media`.
 *
 * A RPC `register_profile_media` continua sendo o caminho preferido — ela valida o
 * objeto no storage antes de gravar. Só que, no projeto implantado, essa função
 * não existe (404 PGRST202) e é exatamente ela que fazia todo upload de foto,
 * capa e vídeo falhar depois de o arquivo já ter subido. A tabela em si tem a
 * política `members add own media metadata`, que faz a mesma checagem do objeto
 * no storage, então o insert direto é um caminho válido e não um contorno: ele
 * só entra quando a RPC não existe.
 */
export async function registerProfileMedia(input: {
  objectPath: string;
  mediaType: "photo" | "video";
  mimeType: string;
  sizeBytes: number;
}) {
  try {
    await rest("rpc/register_profile_media", "", {
      method: "POST",
      body: JSON.stringify({
        p_object_path: input.objectPath,
        p_media_type: input.mediaType,
        p_mime_type: input.mimeType,
        p_size_bytes: input.sizeBytes,
      }),
    });
    return "rpc" as const;
  } catch (cause) {
    if (!isMissingBackendObject(cause)) throw cause;
  }
  await rest("profile_media", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      object_path: input.objectPath,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    }),
  });
  return "insert" as const;
}