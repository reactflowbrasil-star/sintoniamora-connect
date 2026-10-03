import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Bell, Camera, Crown, Heart, Image, MessageCircle, Radio, ShieldCheck, Users, Video } from "lucide-react";
import { getRealtimeClient, getSession, rest, rpc, signedUrl } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { PremiumAccordion } from "@/components/premium-accordion";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });
type Profile = { id: string; display_name: string; bio: string; city: string; state: string; avatar_path: string | null; cover_path: string | null; cover_position_x: number; cover_position_y: number };
type Media = { media_type: "photo" | "video" };
type Subscription = { plan_id: string; status: string; created_at: string };
type Notice = { id: string; read_at: string | null; created_at: string; kind: string };
type Post = { id: string; body: string; created_at: string };
type LiveSession = { id: string; host_id: string; title: string; created_at: string };
type DashboardLive = LiveSession & { host_name: string; avatar_url: string | null };

function Dashboard() {
  const session = getSession();
  const uid = session?.user.id;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileCover, setProfileCover] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [follows, setFollows] = useState({ following: 0, followers: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [lives, setLives] = useState<DashboardLive[]>([]);
  const [liveError, setLiveError] = useState("");
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [profiles, mediaRows, subscriptions, following, followers, postRows, noticeRows, unread, isAdmin, rewards] = await Promise.all([
        rest<Profile[]>("profiles", `id=eq.${uid}&select=id,display_name,bio,city,state,avatar_path,cover_path,cover_position_x,cover_position_y`),
        rest<Media[]>("profile_media", `user_id=eq.${uid}&select=media_type`),
        rest<Subscription[]>("subscriptions", `user_id=eq.${uid}&status=eq.ACTIVE&select=plan_id,status,created_at&order=created_at.desc&limit=1`),
        rest<{ follower_id: string }[]>("follows", `follower_id=eq.${uid}&select=follower_id`),
        rest<{ following_id: string }[]>("follows", `following_id=eq.${uid}&select=following_id`),
        rest<Post[]>("posts", `author_id=eq.${uid}&select=id,body,created_at&order=created_at.desc&limit=5`),
        rest<Notice[]>("notifications", `recipient_id=eq.${uid}&select=id,read_at,created_at,kind&order=created_at.desc&limit=10`),
        rpc<{ conversation_id: string; unread_count: number }[]>("unread_message_counts"),
        rpc<boolean>("current_user_admin"),
        rest<Array<{total_points:number}>>("live_reward_balances", `user_id=eq.${uid}&select=total_points`).catch(() => []),
      ]);
      setProfile(profiles?.[0] ?? null);
      setProfileAvatar(profiles?.[0]?.avatar_path ? await signedUrl(profiles[0].avatar_path).catch(() => "") : "");
      setProfileCover(profiles?.[0]?.cover_path ? await signedUrl(profiles[0].cover_path).catch(() => "") : "");
      setMedia(mediaRows ?? []);
      setSubscription(subscriptions?.[0] ?? null);
      setFollows({ following: following?.length ?? 0, followers: followers?.length ?? 0 });
      setPosts(postRows ?? []);
      setNotices(noticeRows ?? []);
      setUnreadMessages((unread ?? []).reduce((sum, row) => sum + Number(row.unread_count), 0));
      setAdmin(Boolean(isAdmin));
      setRewardPoints(Number(rewards?.[0]?.total_points ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar seu resumo.");
    }
  }, [uid]);

  const loadLives = useCallback(async () => {
    if (!uid) return;
    try {
      const sessions = await rest<LiveSession[]>(
        "live_sessions",
        "status=eq.LIVE&select=id,host_id,title,created_at&order=created_at.desc&limit=20",
      );
      const rows = sessions ?? [];
      const hostIds = [...new Set(rows.map((row) => row.host_id))];
      const profiles = hostIds.length
        ? await rest<Array<{ id: string; display_name: string; avatar_path: string | null }>>(
            "profiles",
            `id=in.(${hostIds.join(",")})&select=id,display_name,avatar_path`,
          )
        : [];
      const people = await Promise.all(
        (profiles ?? []).map(async (profile) => ({
          ...profile,
          avatar_url: profile.avatar_path ? await signedUrl(profile.avatar_path).catch(() => null) : null,
        })),
      );
      const byId = new Map(people.map((person) => [person.id, person]));
      setLives(rows.map((row) => ({
        ...row,
        host_name: byId.get(row.host_id)?.display_name || "Membro",
        avatar_url: byId.get(row.host_id)?.avatar_url ?? null,
      })));
      setLiveError("");
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "Não foi possível atualizar as lives.");
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) { void navigate({ to: "/entrar" }); return; }
    void load();
  }, [uid, navigate, load]);

  useEffect(() => {
    if (!uid) return;
    void loadLives();
    const channel = getRealtimeClient()
      .channel(`dashboard-lives:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => void loadLives())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_interactions" }, () => {
        void rest<Array<{total_points:number}>>("live_reward_balances", `user_id=eq.${uid}&select=total_points`)
          .then((rows) => setRewardPoints(Number(rows?.[0]?.total_points ?? 0)))
          .catch(() => undefined);
      })
      .subscribe();
    const refresh = window.setInterval(() => void loadLives(), 15000);
    return () => {
      window.clearInterval(refresh);
      void getRealtimeClient().removeChannel(channel);
    };
  }, [uid, loadLives]);

  const photos = media.filter((item) => item.media_type === "photo").length;
  const videos = media.filter((item) => item.media_type === "video").length;
  const unreadNotices = notices.filter((item) => !item.read_at).length;
  const profileScore = profile ? [profile.display_name, profile.bio, profile.city, profile.state, photos > 0 || Boolean(profile.avatar_path)].filter(Boolean).length * 20 : 0;
  const planName = subscription?.plan_id === "premium" ? "Premium" : "Gratuito";

  return <main className="member-page dashboard-page">
    <MemberNav current="dashboard" />
    <div className="social-content">
      <div className="social-title dashboard-welcome">
        <span className="auth-kicker">SEU ESPAÇO SEXFLOW</span>
        <h1>Olá, {profile?.display_name || "pessoa"}</h1>
        <p>Um resumo da sua conta, conexões e atividade recente.</p>
      </div>
      {error && <p className="social-message" role="alert">{error}</p>}

      <section className="dashboard-profile-hero" aria-label="Seu perfil">
        <div className="dashboard-profile-cover">
          {profileCover || profileAvatar ? (
            <img
              className={`cover-media-img${profileCover ? "" : " is-fallback"}`}
              src={profileCover || profileAvatar}
              alt=""
              aria-hidden="true"
              decoding="async"
              style={profileCover ? { objectPosition: `${profile?.cover_position_x ?? 50}% ${profile?.cover_position_y ?? 50}%` } : undefined}
            />
          ) : (
            <span className="cover-media-fallback" aria-hidden="true" />
          )}
        </div>
        <div className="dashboard-profile-identity">
          <div className="dashboard-profile-avatar" aria-hidden="true">{profileAvatar ? <img src={profileAvatar} alt=""/> : (profile?.display_name || "S").slice(0, 1).toUpperCase()}</div>
          <div><span className="auth-kicker">SEU PERFIL</span><h2>{profile?.display_name || "Pessoa sexflow"}</h2><p>{[profile?.city, profile?.state].filter(Boolean).join(", ") || "Complete sua localização"}</p></div>
          <div className="dashboard-profile-cta">
            <a className="button button-outline" href="/perfil">Editar perfil</a>
            <a className="button button-primary" href="/perfil#capa">Gerenciar capa</a>
          </div>
        </div>
        <nav className="dashboard-profile-tabs" aria-label="Atalhos do perfil">
          <a href="/dashboard" aria-current="page">Visão geral</a><a href="/perfil">Meu perfil</a><a href="/feed">Comunidade</a><a href="/mensagens">Mensagens</a>
        </nav>
      </section>
      <section className="dashboard-overview" aria-label="Resumo da conta">
        <article className="dashboard-profile-card">
          <span className="dashboard-icon"><Activity size={20} /></span>
          <div><small>Perfil completo</small><strong>{profileScore}%</strong></div>
          <div className="dashboard-progress"><span style={{ width: `${profileScore}%` }} /></div>
          <a className="dashboard-inline-link" href="/perfil">{profileScore < 100 ? "Completar perfil" : "Editar perfil"}</a>
        </article>
        <article className="dashboard-stat"><span><Users size={19} /></span><small>Seguidores</small><strong>{follows.followers}</strong><a href="/explorar">Conhecer pessoas</a></article>
        <article className="dashboard-stat"><span><Heart size={19} /></span><small>Seguindo</small><strong>{follows.following}</strong><a href="/explorar">Explorar perfis</a></article>
        <article className="dashboard-stat"><span><Image size={19} /></span><small>Mídia no perfil</small><strong>{photos + videos}</strong><a href="/perfil">{photos} fotos · {videos} vídeos</a></article>
        <article className="dashboard-stat dashboard-reward-stat"><span><Crown size={19} /></span><small>Pontos de lives</small><strong>{rewardPoints}</strong><a href="/live">Recompensas virtuais</a></article>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading"><div><span className="auth-kicker">ATALHOS</span><h2>O que você quer fazer?</h2></div></div>
        <div className="dashboard-shortcuts">
          <a href="/feed" className="dashboard-shortcut"><span><Activity /></span><b>Ver comunidade</b><small>Publicações e conversas</small></a>
          <a href="/perfil" className="dashboard-shortcut"><span><Camera /></span><b>Editar meu perfil</b><small>Informações, fotos e vídeos</small></a>
          <a href="/mensagens" className="dashboard-shortcut"><span><MessageCircle /></span><b>Mensagens {unreadMessages > 0 && <em>{unreadMessages}</em>}</b><small>Conversas privadas</small></a>
          <a href="/notificacoes" className="dashboard-shortcut"><span><Bell /></span><b>Notificações {unreadNotices > 0 && <em>{unreadNotices}</em>}</b><small>Novas interações</small></a>
          <a href="/live#live-start" className="dashboard-shortcut"><span><Radio /></span><b>Iniciar live</b><small>Transmitir ou assistir agora</small></a>
          <a href="/planos" className="dashboard-shortcut"><span><Crown /></span><b>Meu plano: {planName}</b><small>{subscription ? `Ativo desde ${new Date(subscription.created_at).toLocaleDateString("pt-BR")}` : "Conhecer recursos e limites"}</small></a>
        </div>
      </section>

      <section className="dashboard-section dashboard-guide-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="auth-kicker">GUIA RÁPIDO</span>
            <h2>Comece em poucos passos</h2>
            <p>Toque em cada tópico para ver como aproveitar melhor a comunidade.</p>
          </div>
        </div>
        <PremiumAccordion
          defaultOpen="perfil"
          items={[
            {
              id: "perfil",
              title: "Deixe seu perfil completo",
              hint: "Mais sintonia, mais conexões",
              content: (
                <>
                  <p>
                    Preencha nome, bio, localização e interesses e adicione fotos. Perfis completos
                    aparecem melhor na descoberta.
                  </p>
                  <a className="button button-primary" href="/perfil">
                    Completar meu perfil
                  </a>
                </>
              ),
            },
            {
              id: "descobrir",
              title: "Descubra pessoas",
              hint: "Explore por interesse e cidade",
              content: (
                <>
                  <p>
                    Use a busca para encontrar interesses em comum e siga quem faz sentido para
                    você.
                  </p>
                  <a className="button button-outline" href="/explorar">
                    Explorar perfis
                  </a>
                </>
              ),
            },
            {
              id: "lives",
              title: "Assista ou inicie uma live",
              hint: "Transmissões ao vivo da comunidade",
              content: (
                <>
                  <p>
                    Entre em uma transmissão para conversar no chat ou inicie a sua com câmera e
                    microfone.
                  </p>
                  <a className="button button-outline" href="/live#live-start">
                    Ir para as lives
                  </a>
                </>
              ),
            },
            {
              id: "seguranca",
              title: "Privacidade e segurança",
              hint: "Você no controle",
              content: (
                <>
                  <p>
                    Você escolhe o que compartilhar. Bloqueie, denuncie e ajuste a visibilidade do
                    seu perfil quando quiser.
                  </p>
                  <a className="button button-outline" href="/planos">
                    Ver planos
                  </a>
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="dashboard-section dashboard-live-section" aria-labelledby="dashboard-live-title">
        <div className="dashboard-section-heading"><div><span className="auth-kicker">AO VIVO AGORA</span><h2 id="dashboard-live-title">Lives da comunidade <span className="dashboard-live-count">{lives.length}</span></h2><p>Atualização em tempo real · entre para acompanhar e conversar.</p></div><a href="/live#live-directory">Abrir todas as lives →</a></div>
        {liveError && <p className="social-message" role="status">{liveError}</p>}
        {lives.length ? <div className="dashboard-live-grid">{lives.map((live) => <article className="dashboard-live-card" key={live.id}>
          <div className="dashboard-live-person">{live.avatar_url ? <img src={live.avatar_url} alt="" /> : <span>{live.host_name.slice(0,1).toUpperCase()}</span>}<div><b>{live.host_name}{live.host_id === uid ? " · você" : ""}</b><small><i /> Transmitindo agora</small></div></div>
          <h3>{live.title}</h3><a className="button button-primary" href={`/live?session=${encodeURIComponent(live.id)}#live-directory`}>{live.host_id === uid ? "Abrir minha live" : "Entrar e interagir"}</a>
        </article>)}</div> : <div className="dashboard-live-empty"><Radio size={22}/><p>{liveError ? "Tentaremos novamente em instantes." : "Ainda não há lives ativas. Quando alguém começar, ela aparecerá aqui automaticamente."}</p><a className="button button-outline" href="/live#live-start">Iniciar uma live</a></div>}
      </section>

      <section className="dashboard-section dashboard-lower-grid">
        <div className="dashboard-panel">
          <div className="dashboard-section-heading"><div><span className="auth-kicker">ATIVIDADE</span><h2>Suas últimas publicações</h2></div><a href="/feed">Abrir feed</a></div>
          {posts.length ? <ul className="dashboard-post-list">{posts.map((post) => <li key={post.id}><p>{post.body}</p><time>{new Date(post.created_at).toLocaleString("pt-BR")}</time></li>)}</ul> : <p className="dashboard-muted">Suas publicações aparecerão aqui. Compartilhe algo no feed para começar.</p>}
        </div>
        <div className="dashboard-panel">
          <div className="dashboard-section-heading"><div><span className="auth-kicker">SEGURANÇA E PLANO</span><h2>Conta em dia</h2></div><ShieldCheck size={20} /></div>
          <ul className="dashboard-checklist"><li><span>✓</span>Conta autenticada</li><li><span>{profile?.bio ? "✓" : "○"}</span>{profile?.bio ? "Apresentação preenchida" : "Adicione uma apresentação ao perfil"}</li><li><span>{photos ? "✓" : "○"}</span>{photos ? `${photos} fotos no perfil` : "Adicione fotos para personalizar seu perfil"}</li><li><span>{subscription?.plan_id === "premium" ? "✓" : "○"}</span>{subscription?.plan_id === "premium" ? "Plano Premium ativo" : "Você está no plano gratuito"}</li></ul>
          <a className="button button-outline" href="/planos">Ver opções de plano</a>
        </div>
      </section>
      {admin && <a className="dashboard-admin-banner" href="/admin"><ShieldCheck size={20} /><span><b>Painel de administração</b><small>Abrir gestão do sistema</small></span><span aria-hidden="true">→</span></a>}
    </div>
  </main>;
}
