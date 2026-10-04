import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSession, rest, signedUrl } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { Heart, MessageCircle, Ban, Flag } from "lucide-react";
export const Route = createFileRoute("/explorar")({ component: Explore });
type Profile = {
  id: string;
  display_name: string;
  bio: string;
  city: string;
  state: string;
  interests: string[];
  avatar_path: string | null;
};
type Follow = { following_id: string };
function Explore() {
  const session = getSession(),
    uid = session?.user.id,
    nav = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [avatars, setAvatars] = useState<Record<string, string>>({}),
    [following, setFollowing] = useState<Set<string>>(new Set()),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [people, follows] = await Promise.all([
        rest<Profile[]>(
          "profiles",
          `id=neq.${uid}&select=id,display_name,bio,city,state,interests,avatar_path&limit=60`,
        ),
        rest<Follow[]>("follows", `follower_id=eq.${uid}&select=following_id`),
      ]);
      setProfiles(people ?? []);
      const avatarUrls = await Promise.all((people ?? []).filter((person) => person.avatar_path).map(async (person) => [person.id, await signedUrl(person.avatar_path!).catch(() => "")] as const));
      setAvatars(Object.fromEntries(avatarUrls.filter(([, url]) => url)));
      setFollowing(new Set((follows ?? []).map((x) => x.following_id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os perfis.");
    }
  }, [uid]);
  useEffect(() => {
    if (!uid) {
      nav({ to: "/entrar" });
      return;
    }
    void load();
  }, [uid, nav, load]);
  const visible = useMemo(
    () =>
      profiles.filter((p) =>
        (p.display_name + " " + p.city + " " + p.state + " " + (p.interests ?? []).join(" "))
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [profiles, query],
  );
  async function toggleFollow(id: string) {
    if (!uid) return;
    setBusy(id);
    try {
      if (following.has(id))
        await rest("follows", `follower_id=eq.${uid}&following_id=eq.${id}`, { method: "DELETE" });
      else
        await rest("follows", "", {
          method: "POST",
          body: JSON.stringify({ follower_id: uid, following_id: id }),
        });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao seguir perfil.");
    } finally {
      setBusy("");
    }
  }
  async function message(id: string) {
    setBusy(id);
    try {
      const conversation = await rest<string>("rpc/start_conversation", "", {
        method: "POST",
        body: JSON.stringify({ other_member: id }),
      });
      window.location.href = `${import.meta.env.BASE_URL}mensagens?conversation=${conversation}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a conversa.");
    } finally {
      setBusy("");
    }
  }
  async function block(id: string) {
    if (
      !uid ||
      !confirm(
        "Bloquear este perfil? Vocês deixarão de encontrar as publicações e o acesso à conversa será interrompido.",
      )
    )
      return;
    try {
      await rest("blocks", "", {
        method: "POST",
        body: JSON.stringify({ blocker_id: uid, blocked_id: id }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível bloquear.");
    }
  }
  async function report(id: string) {
    if (!uid) return;
    const reason = prompt("Motivo da denúncia:");
    if (!reason?.trim()) return;
    try {
      await rest("reports", "", {
        method: "POST",
        body: JSON.stringify({
          reporter_id: uid,
          target_user_id: id,
          reason: reason.trim().slice(0, 80),
        }),
      });
      setError("Denúncia enviada à equipe de moderação.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível denunciar.");
    }
  }
  return (
    <main className="member-page">
      <MemberNav current="explorar" />
      <div className="social-content">
        <section className="social-title">
          <span className="auth-kicker">PESSOAS REAIS DA COMUNIDADE</span>
          <h1>Explore perfis</h1>
          <p>
            Use a busca para encontrar interesses em comum. Para filtrar por categoria, cidade ou
            estado, use a <a href="/busca">busca completa</a>.
          </p>
        </section>
        <input
          className="explore-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, cidade ou interesse…"
          aria-label="Buscar perfis"
        />
        {error && (
          <p className="social-message" role="status">
            {error}
          </p>
        )}
        <section className="people-grid">
          {visible.map((p) => (
            <article className="person-card" key={p.id}>
              <div className="person-avatar">{avatars[p.id] ? <img src={avatars[p.id]} alt={`Foto de ${p.display_name}`} /> : (p.display_name || "S").slice(0, 1).toUpperCase()}</div>
              <h2>{p.display_name}</h2>
              <p className="person-location">
                {[p.city, p.state].filter(Boolean).join(", ") || "Localização não informada"}
              </p>
              <p className="person-bio">{p.bio || "Este perfil ainda não adicionou uma bio."}</p>
              {p.interests?.length > 0 && (
                <div className="interest-list">
                  {p.interests.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              )}
              <div className="person-actions">
                <a className="button button-outline" href={`/perfil-publico?usuario=${encodeURIComponent(p.id)}`}>Ver perfil</a>
                <button
                  className="button button-primary"
                  disabled={busy === p.id}
                  onClick={() => toggleFollow(p.id)}
                >
                  <Heart size={16} />
                  {following.has(p.id) ? "Seguindo" : "Seguir"}
                </button>
                <button
                  className="button button-outline"
                  disabled={busy === p.id}
                  onClick={() => message(p.id)}
                >
                  <MessageCircle size={16} />
                  Mensagem
                </button>
              </div>
              <div className="person-safety">
                <button onClick={() => block(p.id)}>
                  <Ban size={15} /> Bloquear
                </button>
                <button onClick={() => report(p.id)}>
                  <Flag size={15} /> Denunciar
                </button>
              </div>
            </article>
          ))}
        </section>
        {visible.length === 0 && (
          <div className="social-empty">Nenhum perfil encontrado com esse filtro.</div>
        )}
      </div>
    </main>
  );
}
