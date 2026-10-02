import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { getSession, rest, signedUrl } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/perfil-publico")({ component: PublicProfile });
type PublicProfileData = { id: string; display_name: string; bio: string; city: string; state: string; interests: string[]; avatar_path: string | null };

function PublicProfile() {
  const uid = getSession()?.user.id;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) { void navigate({ to: "/entrar" }); return; }
    const id = new URLSearchParams(window.location.search).get("usuario");
    if (!id) { setError("Este perfil não foi encontrado."); return; }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await rest<PublicProfileData[]>("profiles", `id=eq.${encodeURIComponent(id)}&select=id,display_name,bio,city,state,interests,avatar_path&limit=1`);
        if (cancelled) return;
        const person = rows?.[0];
        if (!person) { setError("Este perfil não está disponível para você."); return; }
        setProfile(person);
        if (person.avatar_path) {
          const url = await signedUrl(person.avatar_path).catch(() => "");
          if (!cancelled) setAvatar(url);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
      }
    })();
    return () => { cancelled = true; };
  }, [uid, navigate]);

  async function message() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const conversation = await rest<string>("rpc/start_conversation", "", { method: "POST", body: JSON.stringify({ other_member: profile.id }) });
      window.location.href = `/mensagens?conversation=${encodeURIComponent(conversation)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a conversa.");
    } finally { setBusy(false); }
  }

  return <main className="member-page public-profile-page">
    <MemberNav current="explorar" />
    <div className="social-content">
      <a className="public-profile-back" href="/explorar"><ArrowLeft size={17}/> Voltar para explorar</a>
      {error && <p className="social-message" role="alert">{error}</p>}
      {profile && <article className="public-profile-card">
        <div className="public-profile-cover" />
        <div className="public-profile-body">
          <div className="public-profile-identity">
            {avatar ? <img src={avatar} alt={`Foto de ${profile.display_name}`} /> : <span><UserRound size={35}/></span>}
            <div><span className="auth-kicker">PESSOA DA COMUNIDADE</span><h1>{profile.display_name || "Membro"}</h1><p><MapPin size={16}/>{[profile.city, profile.state].filter(Boolean).join(", ") || "Localização não informada"}</p></div>
            {profile.id !== uid && <button className="button button-primary" disabled={busy} onClick={() => void message()}><MessageCircle size={17}/>{busy ? "Abrindo conversa…" : "Conversar"}</button>}
          </div>
          <section className="public-profile-about"><h2>Sobre</h2><p>{profile.bio || "Este perfil ainda não adicionou uma apresentação."}</p></section>
          {profile.interests?.length > 0 && <section className="public-profile-about"><h2><Sparkles size={17}/> Interesses</h2><div className="public-profile-interests">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></section>}
        </div>
      </article>}
    </div>
  </main>;
}
