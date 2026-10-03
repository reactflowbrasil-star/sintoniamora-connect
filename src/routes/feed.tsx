import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileUp, Heart, LockKeyhole, MessageCircle, Send, Trash2, Flag } from "lucide-react";
import { getSession, removeUpload, rest, signedUrl, upload } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { MediaLightbox, type LightboxMedia } from "@/components/media-lightbox";
export const Route = createFileRoute("/feed")({ component: Feed });
type Post = {
  id: string;
  author_id: string;
  body: string;
  audience: "PUBLIC" | "FOLLOWERS";
  created_at: string;
};
type PostMedia = {
  id: string;
  post_id: string;
  owner_id: string;
  object_path: string;
  media_type: "photo" | "video";
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url?: string;
};
type Profile = { id: string; display_name: string; city: string; state: string };
type Like = { post_id: string; user_id: string };
type Comment = { id: string; post_id: string; user_id: string; body: string; created_at: string };
function Feed() {
  const session = getSession(),
    uid = session?.user.id,
    nav = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]),
    [profiles, setProfiles] = useState<Record<string, Profile>>({}),
    [likes, setLikes] = useState<Like[]>([]),
    [comments, setComments] = useState<Comment[]>([]),
    [draft, setDraft] = useState(""),
    [mediaFiles, setMediaFiles] = useState<File[]>([]),
    [audience, setAudience] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC"),
    [postMedia, setPostMedia] = useState<Record<string, PostMedia[]>>({}),
    [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({}),
    [lightbox, setLightbox] = useState<LightboxMedia | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const rows = await rest<Post[]>(
        "posts",
        "status=eq.PUBLISHED&select=id,author_id,body,audience,created_at&order=created_at.desc&limit=30",
      );
      setPosts(rows ?? []);
      if (!rows?.length) {
        setProfiles({});
        setLikes([]);
        setComments([]);
        setPostMedia({});
        return;
      }
      const postIds = rows.map((p) => p.id).join(",");
      const [ls, cs, files] = await Promise.all([
        rest<Like[]>("likes", `post_id=in.(${postIds})&select=post_id,user_id`),
        rest<Comment[]>(
          "comments",
          `post_id=in.(${postIds})&select=id,post_id,user_id,body,created_at&order=created_at.desc&limit=100`,
        ),
        rest<PostMedia[]>(
          "post_media",
          `post_id=in.(${postIds})&select=id,post_id,owner_id,object_path,media_type,mime_type,size_bytes,created_at&order=created_at.asc`,
        ).catch(() => []),
      ]);
      const mediaWithUrls = await Promise.all(
        (files ?? []).map(async (file) => ({
          ...file,
          url: await signedUrl(file.object_path, "post-media").catch(() => ""),
        })),
      );
      const ids = [
        ...new Set([...rows.map((p) => p.author_id), ...(cs ?? []).map((c) => c.user_id)]),
      ].join(",");
      const ps = await rest<Profile[]>(
        "profiles",
        `id=in.(${ids})&select=id,display_name,city,state`,
      );
      setProfiles(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
      setLikes(ls ?? []);
      setComments(cs ?? []);
      setPostMedia(
        Object.fromEntries(
          rows.map((post) => [
            post.id,
            mediaWithUrls.filter((file) => file.post_id === post.id && file.url),
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o feed.");
    }
  }, [uid]);
  useEffect(() => {
    if (!uid) {
      nav({ to: "/entrar" });
      return;
    }
    void load();
  }, [uid, nav, load]);
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid || (!draft.trim() && mediaFiles.length === 0)) return;
    setBusy(true);
    setError("");
    const uploadedPaths: string[] = [];
    let createdPostId = "";
    try {
      const createdRows = await rest<Post[]>(
        "posts",
        "select=id,author_id,body,audience,created_at",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            author_id: uid,
            body: draft.trim() || "📷 Mídia compartilhada",
            audience,
          }),
        },
      );
      createdPostId = createdRows?.[0]?.id ?? "";
      if (!createdPostId) throw new Error("O servidor não confirmou a publicação.");
      const mediaMetadata: Array<Omit<PostMedia, "id" | "created_at">> = [];
      for (const file of mediaFiles) {
        const mediaType = file.type.startsWith("video/") ? "video" : "photo";
        const maxBytes = mediaType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxBytes)
          throw new Error(
            `${file.name}: o limite é ${mediaType === "video" ? "50 MB para vídeo" : "10 MB para foto"}.`,
          );
        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ];
        if (!allowed.includes(file.type)) throw new Error(`${file.name}: formato não permitido.`);
        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "") || (mediaType === "video" ? "mp4" : "jpg");
        const objectPath = `${uid}/${createdPostId}/${crypto.randomUUID()}.${extension}`;
        await upload(objectPath, file, "post-media");
        uploadedPaths.push(objectPath);
        mediaMetadata.push({
          post_id: createdPostId,
          owner_id: uid,
          object_path: objectPath,
          media_type: mediaType,
          mime_type: file.type,
          size_bytes: file.size,
        });
      }
      if (mediaMetadata.length)
        await rest("post_media", "", { method: "POST", body: JSON.stringify(mediaMetadata) });
      setDraft("");
      setMediaFiles([]);
      await load();
    } catch (cause) {
      if (createdPostId)
        await rest("posts", `id=eq.${createdPostId}&author_id=eq.${uid}`, {
          method: "DELETE",
        }).catch(() => undefined);
      await Promise.all(
        uploadedPaths.map((path) => removeUpload(path, "post-media").catch(() => undefined)),
      );
      setError(cause instanceof Error ? cause.message : "Falha ao publicar.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleLike(postId: string) {
    if (!uid) return;
    setError("");
    try {
      const own = likes.some((x) => x.post_id === postId && x.user_id === uid);
      if (own) await rest("likes", `post_id=eq.${postId}&user_id=eq.${uid}`, { method: "DELETE" });
      else
        await rest("likes", "", {
          method: "POST",
          body: JSON.stringify({ post_id: postId, user_id: uid }),
        });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao registrar curtida.");
    }
  }
  async function comment(postId: string) {
    if (!uid || !commentDrafts[postId]?.trim()) return;
    try {
      await rest("comments", "", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, user_id: uid, body: commentDrafts[postId].trim() }),
      });
      setCommentDrafts({ ...commentDrafts, [postId]: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao comentar.");
    }
  }
  async function report(postId: string) {
    if (!uid) return;
    const reason = window.prompt(
      "Motivo da denúncia (ex.: assédio, spam, conteúdo sem consentimento):",
    );
    if (!reason?.trim()) return;
    try {
      await rest("reports", "", {
        method: "POST",
        body: JSON.stringify({
          reporter_id: uid,
          target_post_id: postId,
          reason: reason.trim().slice(0, 80),
        }),
      });
      setError("Denúncia enviada à equipe de moderação.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao denunciar.");
    }
  }
  async function remove(postId: string) {
    if (!uid || !confirm("Excluir esta publicação?")) return;
    try {
      const files = await rest<PostMedia[]>(
        "post_media",
        `post_id=eq.${postId}&select=object_path`,
      );
      await rest("posts", `id=eq.${postId}&author_id=eq.${uid}`, { method: "DELETE" });
      await Promise.all(
        (files ?? []).map((file) =>
          removeUpload(file.object_path, "post-media").catch(() => undefined),
        ),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir publicação.");
    }
  }
  return (
    <main className="member-page">
      <MemberNav current="feed" />
      <div className="social-content">
        <section className="social-title">
          <span className="auth-kicker">COMUNIDADE</span>
          <h1>Feed</h1>
          <p>Compartilhe ideias e interaja com respeito.</p>
        </section>
        <form id="composer" className="post-composer" onSubmit={publish}>
          <label htmlFor="post-body">O que você gostaria de compartilhar?</label>
          <textarea
            id="post-body"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Escreva sua publicação…"
            rows={4}
          />
          <div className="feed-composer-options">
            <label className="feed-audience-label">
              Quem pode ver?
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as "PUBLIC" | "FOLLOWERS")}
              >
                <option value="PUBLIC">Público · qualquer pessoa logada</option>
                <option value="FOLLOWERS">Restrito · seguidores cadastrados</option>
              </select>
            </label>
            <label className="feed-media-picker">
              <FileUp size={17} />
              <span>Adicionar fotos ou vídeos</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => {
                  const selected = Array.from(e.currentTarget.files ?? []);
                  e.currentTarget.value = "";
                  if (selected.length > 4) {
                    setError("Escolha até 4 fotos ou vídeos por publicação.");
                    return;
                  }
                  setMediaFiles(selected);
                  setError("");
                }}
              />
            </label>
          </div>
          {mediaFiles.length > 0 && (
            <ul className="feed-selected-media">
              {mediaFiles.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  {file.type.startsWith("video/") ? "Vídeo" : "Foto"}: {file.name}
                </li>
              ))}
            </ul>
          )}
          <div>
            <span>{draft.length}/1000</span>
            <button
              className="button button-primary"
              disabled={busy || (!draft.trim() && mediaFiles.length === 0)}
              aria-busy={busy}
            >
              <Send size={16} />
              {busy ? (mediaFiles.length ? "Enviando mídia…" : "Publicando…") : "Publicar"}
            </button>
          </div>
        </form>
        {error && (
          <p className="social-message" role="status">
            {error}
          </p>
        )}
        {posts.length === 0 && (
          <div className="social-empty">
            Ainda não há publicações. Seja a primeira pessoa a compartilhar algo.
          </div>
        )}
        <section className="post-list">
          {posts.map((post) => {
            const author = profiles[post.author_id];
            const ownLike = likes.some((x) => x.post_id === post.id && x.user_id === uid);
            return (
              <article className="post-card" key={post.id}>
                <header>
                  <div className="post-avatar">
                    {(author?.display_name || "S").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <b>{author?.display_name || "Membro"}</b>
                    <small>
                      {author?.city
                        ? author.city + (author.state ? ", " + author.state : "")
                        : "Comunidade"}{" "}
                      · {new Date(post.created_at).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  {post.author_id === uid ? (
                    <button
                      className="icon-button"
                      aria-label="Excluir publicação"
                      onClick={() => remove(post.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label="Denunciar publicação"
                      onClick={() => report(post.id)}
                    >
                      <Flag size={17} />
                    </button>
                  )}
                </header>
                <p className="post-body">{post.body}</p>
                {post.audience === "FOLLOWERS" && (
                  <span className="post-audience-badge">
                    <LockKeyhole size={13} /> Só seguidores
                  </span>
                )}
                {(postMedia[post.id] ?? []).length > 0 && (
                  <div className="post-media-grid">
                    {(postMedia[post.id] ?? []).map((media) =>
                      media.media_type === "photo" ? (
                        <button
                          key={media.id}
                          type="button"
                          className="media-open"
                          aria-label="Ampliar foto da publicação"
                          onClick={() =>
                            setLightbox({
                              url: media.url ?? "",
                              type: "photo",
                              alt: "Foto da publicação",
                            })
                          }
                        >
                          <img src={media.url} alt="Foto da publicação" loading="lazy" />
                        </button>
                      ) : (
                        <button
                          key={media.id}
                          type="button"
                          className="media-open"
                          aria-label="Ampliar vídeo da publicação"
                          onClick={() =>
                            setLightbox({
                              url: media.url ?? "",
                              type: "video",
                              alt: "Vídeo da publicação",
                            })
                          }
                        >
                          <video src={media.url} preload="metadata" muted aria-label="Vídeo da publicação" />
                          <span className="media-open-play" aria-hidden="true">
                            ▶
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
                <div className="post-actions">
                  <button
                    onClick={() => toggleLike(post.id)}
                    aria-pressed={ownLike}
                    className={ownLike ? "liked" : ""}
                  >
                    <Heart size={18} />
                    {likes.filter((x) => x.post_id === post.id).length}
                  </button>
                  <span>
                    <MessageCircle size={18} />
                    {comments.filter((x) => x.post_id === post.id).length}
                  </span>
                </div>
                <div className="post-comments">
                  {comments
                    .filter((x) => x.post_id === post.id)
                    .slice(0, 3)
                    .reverse()
                    .map((c) => (
                      <p key={c.id}>
                        <b>{profiles[c.user_id]?.display_name || "Membro"}:</b> {c.body}
                      </p>
                    ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void comment(post.id);
                    }}
                  >
                    <input
                      aria-label="Escreva um comentário"
                      maxLength={500}
                      value={commentDrafts[post.id] || ""}
                      onChange={(e) =>
                        setCommentDrafts({ ...commentDrafts, [post.id]: e.target.value })
                      }
                      placeholder="Escreva um comentário…"
                    />
                    <button aria-label="Enviar comentário">
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      </div>
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </main>
  );
}
