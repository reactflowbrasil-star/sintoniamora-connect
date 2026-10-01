import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Heart, MessageCircle, Send, Trash2, Flag } from "lucide-react";
import { getSession, rest } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
export const Route = createFileRoute("/feed")({ component: Feed });
type Post = { id: string; author_id: string; body: string; created_at: string };
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
    [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const rows = await rest<Post[]>(
        "posts",
        "status=eq.PUBLISHED&select=id,author_id,body,created_at&order=created_at.desc&limit=30",
      );
      setPosts(rows ?? []);
      if (!rows?.length) {
        setProfiles({});
        setLikes([]);
        setComments([]);
        return;
      }
      const postIds = rows.map((p) => p.id).join(",");
      const [ls, cs] = await Promise.all([
        rest<Like[]>("likes", `post_id=in.(${postIds})&select=post_id,user_id`),
        rest<Comment[]>(
          "comments",
          `post_id=in.(${postIds})&select=id,post_id,user_id,body,created_at&order=created_at.desc&limit=100`,
        ),
      ]);
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
    if (!uid || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      await rest("posts", "", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ author_id: uid, body: draft.trim() }),
      });
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao publicar.");
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
      await rest("posts", `id=eq.${postId}&author_id=eq.${uid}`, { method: "DELETE" });
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
            required
            placeholder="Escreva sua publicação…"
            rows={4}
          />
          <div>
            <span>{draft.length}/1000</span>
            <button className="button button-primary" disabled={busy || !draft.trim()}>
              <Send size={16} />
              {busy ? "Publicando…" : "Publicar"}
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
    </main>
  );
}
