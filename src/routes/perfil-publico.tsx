import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { getSession, rest, signedUrl } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/perfil-publico")({ component: PublicProfile });
type PublicProfileData = {
  id: string;
  display_name: string;
  bio: string;
  city: string;
  state: string;
  interests: string[];
  avatar_path: string | null;
  cover_path: string | null;
};
type ProfileMedia = {
  id: string;
  object_path: string;
  media_type: "photo" | "video";
  created_at: string;
};

function PublicProfile() {
  const uid = getSession()?.user.id;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");
  const [gallery, setGallery] = useState<Array<ProfileMedia & { url: string }>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) {
      void navigate({ to: "/entrar" });
      return;
    }
    const id = new URLSearchParams(window.location.search).get("usuario");
    if (!id) {
      setError("Este perfil não foi encontrado.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await rest<PublicProfileData[]>(
          "profiles",
          `id=eq.${encodeURIComponent(id)}&select=id,display_name,bio,city,state,interests,avatar_path,cover_path&limit=1`,
        );
        if (cancelled) return;
        const person = rows?.[0];
        if (!person) {
          setError("Este perfil não está disponível para você.");
          return;
        }
        setProfile(person);
        const media = await rest<ProfileMedia[]>(
          "profile_media",
          `user_id=eq.${encodeURIComponent(person.id)}&select=id,object_path,media_type,created_at&order=created_at.desc`,
        );
        const [avatarUrl, coverUrl, galleryWithUrls] = await Promise.all([
          person.avatar_path ? signedUrl(person.avatar_path).catch(() => "") : Promise.resolve(""),
          person.cover_path ? signedUrl(person.cover_path).catch(() => "") : Promise.resolve(""),
          Promise.all(
            (media ?? []).map(async (item) => ({
              ...item,
              url: await signedUrl(item.object_path).catch(() => ""),
            })),
          ),
        ]);
        if (!cancelled) {
          setAvatar(avatarUrl);
          setCover(coverUrl);
          setGallery(galleryWithUrls.filter((item) => item.url));
        }
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, navigate]);

  async function message() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const conversation = await rest<string>("rpc/start_conversation", "", {
        method: "POST",
        body: JSON.stringify({ other_member: profile.id }),
      });
      window.location.href = `/mensagens?conversation=${encodeURIComponent(conversation)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a conversa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="member-page public-profile-page">
      <MemberNav current="explorar" />
      <div className="social-content">
        <a className="public-profile-back" href="/explorar">
          <ArrowLeft size={17} /> Voltar para explorar
        </a>
        {error && (
          <p className="social-message" role="alert">
            {error}
          </p>
        )}
        {profile && (
          <article className="public-profile-card">
            <div
              className="public-profile-cover"
              style={
                cover
                  ? { backgroundImage: `linear-gradient(90deg,#10090d33,#10090d11),url(${cover})` }
                  : undefined
              }
            />
            <div className="public-profile-body">
              <div className="public-profile-identity">
                {avatar ? (
                  <img src={avatar} alt={`Foto de ${profile.display_name}`} />
                ) : (
                  <span>
                    <UserRound size={35} />
                  </span>
                )}
                <div>
                  <span className="auth-kicker">PESSOA DA COMUNIDADE</span>
                  <h1>{profile.display_name || "Membro"}</h1>
                  <p>
                    <MapPin size={16} />
                    {[profile.city, profile.state].filter(Boolean).join(", ") ||
                      "Localização não informada"}
                  </p>
                </div>
                {profile.id !== uid && (
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => void message()}
                  >
                    <MessageCircle size={17} />
                    {busy ? "Abrindo conversa…" : "Conversar"}
                  </button>
                )}
              </div>
              <section className="public-profile-about">
                <h2>Sobre</h2>
                <p>{profile.bio || "Este perfil ainda não adicionou uma apresentação."}</p>
              </section>
              {profile.interests?.length > 0 && (
                <section className="public-profile-about">
                  <h2>
                    <Sparkles size={17} /> Interesses
                  </h2>
                  <div className="public-profile-interests">
                    {profile.interests.map((interest) => (
                      <span key={interest}>{interest}</span>
                    ))}
                  </div>
                </section>
              )}
              <section className="public-profile-about">
                <h2>
                  <Sparkles size={17} /> Fotos e vídeos
                </h2>
                {gallery.length ? (
                  <div className="public-profile-gallery">
                    {gallery.map((item) =>
                      item.media_type === "photo" ? (
                        <img
                          key={item.id}
                          src={item.url}
                          alt={`Foto de ${profile.display_name}`}
                          loading="lazy"
                        />
                      ) : (
                        <video
                          key={item.id}
                          src={item.url}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label={`Vídeo de ${profile.display_name}`}
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <p>Este perfil ainda não tem fotos ou vídeos na galeria.</p>
                )}
              </section>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
