import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Bell, Camera, Crown, Heart, Image, MessageCircle, Radio, ShieldCheck, Users, Video } from "lucide-react";
import { getSession, rest, rpc } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });
type Profile = { id: string; display_name: string; bio: string; city: string; state: string; avatar_path: string | null };
type Media = { media_type: "photo" | "video" };
type Subscription = { plan_id: string; status: string; created_at: string };
type Notice = { id: string; read_at: string | null; created_at: string; kind: string };
type Post = { id: string; body: string; created_at: string };

function Dashboard() {
  const session = getSession();
  const uid = session?.user.id;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [follows, setFollows] = useState({ following: 0, followers: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [profiles, mediaRows, subscriptions, following, followers, postRows, noticeRows, unread, isAdmin] = await Promise.all([
        rest<Profile[]>("profiles", `id=eq.${uid}&select=id,display_name,bio,city,state,avatar_path`),
        rest<Media[]>("profile_media", `user_id=eq.${uid}&select=media_type`),
        rest<Subscription[]>("subscriptions", `user_id=eq.${uid}&status=eq.ACTIVE&select=plan_id,status,created_at&order=created_at.desc&limit=1`),
        rest<{ follower_id: string }[]>("follows", `follower_id=eq.${uid}&select=follower_id`),
        rest<{ following_id: string }[]>("follows", `following_id=eq.${uid}&select=following_id`),
        rest<Post[]>("posts", `author_id=eq.${uid}&select=id,body,created_at&order=created_at.desc&limit=5`),
        rest<Notice[]>("notifications", `recipient_id=eq.${uid}&select=id,read_at,created_at,kind&order=created_at.desc&limit=10`),
        rpc<{ conversation_id: string; unread_count: number }[]>("unread_message_counts"),
        rpc<boolean>("current_user_admin"),
      ]);
      setProfile(profiles?.[0] ?? null);
      setMedia(mediaRows ?? []);
      setSubscription(subscriptions?.[0] ?? null);
      setFollows({ following: following?.length ?? 0, followers: followers?.length ?? 0 });
      setPosts(postRows ?? []);
      setNotices(noticeRows ?? []);
      setUnreadMessages((unread ?? []).reduce((sum, row) => sum + Number(row.unread_count), 0));
      setAdmin(Boolean(isAdmin));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar seu resumo.");
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) { void navigate({ to: "/entrar" }); return; }
    void load();
  }, [uid, navigate, load]);

  const photos = media.filter((item) => item.media_type === "photo").length;
  const videos = media.filter((item) => item.media_type === "video").length;
  const unreadNotices = notices.filter((item) => !item.read_at).length;
  const profileScore = profile ? [profile.display_name, profile.bio, profile.city, profile.state, photos > 0 || Boolean(profile.avatar_path)].filter(Boolean).length * 20 : 0;
  const planName = subscription?.plan_id === "premium" ? "Premium" : "Gratuito";

  return <main className="member-page dashboard-page">
    <MemberNav current="dashboard" />
    <div className="social-content">
      <div className="social-title dashboard-welcome">
        <span className="auth-kicker">SEU ESPAÇO SINTONIAMORA</span>
        <h1>Olá, {profile?.display_name || "pessoa"}</h1>
        <p>Um resumo da sua conta, conexões e atividade recente.</p>
      </div>
      {error && <p className="social-message" role="alert">{error}</p>}

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
