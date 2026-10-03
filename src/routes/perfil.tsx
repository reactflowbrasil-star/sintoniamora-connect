import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { getSession, removeUpload, rest, signOut, signedUrl, upload } from "@/lib/supabase";
import { ImagePlus, LogOut, Trash2, Video } from "lucide-react";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/perfil")({ component: MyProfile });

type Profile = {
  id: string;
  display_name: string;
  bio: string;
  city: string;
  state: string;
  interests: string[];
  avatar_path: string | null;
  cover_path: string | null;
  cover_position_x: number;
  cover_position_y: number;
};
type Media = { id: string; object_path: string; media_type: "photo" | "video"; created_at: string };
type Subscription = { plan_id: string; status: string; created_at: string };
type PlanFeature = { plan_id: string; feature_key: string; feature_value: number };
type Limits = { photos: number; videos: number };
type CoverDraft = { path: string; url: string };

function MyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [limits, setLimits] = useState<Limits>({ photos: 5, videos: 2 });
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [coverDraft, setCoverDraft] = useState<CoverDraft | null>(null);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [coverDirty, setCoverDirty] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);
  const coverRevision = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasOverflow = useRef({ x: 0, y: 0 });
  const dragPoint = useRef<{ x: number; y: number } | null>(null);
  const session = getSession();
  const nav = useNavigate();
  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [profiles, mediaRows, subscriptions, features] = await Promise.all([
        rest<Profile[]>(
          "profiles",
          `id=eq.${userId}&select=id,display_name,bio,city,state,interests,avatar_path,cover_path,cover_position_x,cover_position_y`,
        ),
        rest<Media[]>(
          "profile_media",
          `user_id=eq.${userId}&select=id,object_path,media_type,created_at&order=created_at.desc`,
        ),
        rest<Subscription[]>(
          "subscriptions",
          `user_id=eq.${userId}&status=eq.ACTIVE&select=plan_id,status,created_at&order=created_at.desc&limit=1`,
        ),
        rest<PlanFeature[]>("plan_features", "select=plan_id,feature_key,feature_value"),
      ]);
      const currentPlan = subscriptions?.some((item) => item.plan_id === "premium")
        ? "premium"
        : "free";
      const values = new Map(
        (features ?? [])
          .filter((feature) => feature.plan_id === currentPlan)
          .map((feature) => [feature.feature_key, feature.feature_value]),
      );
      setPlan(currentPlan);
      setLimits({
        photos: values.get("max_profile_photos") ?? (currentPlan === "premium" ? 30 : 5),
        videos: values.get("max_profile_videos") ?? (currentPlan === "premium" ? 10 : 2),
      });
      setProfile(profiles?.[0] ?? null);
      setMedia(mediaRows ?? []);
      const signed = await Promise.allSettled(
        (mediaRows ?? []).map(
          async (item) => [item.id, await signedUrl(item.object_path)] as const,
        ),
      );
      setUrls(
        Object.fromEntries(
          signed.filter((item) => item.status === "fulfilled").map((item) => item.value),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar perfil.");
    }
  }, [userId]);

  useEffect(() => {
    if (!coverDraft || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = new Image();
    image.onload = () => {
      const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const overflowX = Math.max(0, width - canvas.width);
      const overflowY = Math.max(0, height - canvas.height);
      canvasOverflow.current = { x: overflowX, y: overflowY };
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        -(overflowX * coverPosition.x) / 100,
        -(overflowY * coverPosition.y) / 100,
        width,
        height,
      );
      const shade = context.createLinearGradient(0, 0, 0, canvas.height);
      shade.addColorStop(0, "rgba(8, 5, 8, 0.05)");
      shade.addColorStop(1, "rgba(8, 5, 8, 0.35)");
      context.fillStyle = shade;
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
    image.src = coverDraft.url;
  }, [coverDraft, coverPosition]);

  useEffect(() => {
    if (!coverDraft || !coverDirty || !profile || !userId) return;
    const revision = coverRevision.current;
    const timer = window.setTimeout(() => {
      setCoverSaving(true);
      void rest("profiles", `id=eq.${userId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          cover_path: coverDraft.path,
          cover_position_x: coverPosition.x,
          cover_position_y: coverPosition.y,
        }),
      })
        .then(() => {
          setProfile((current) =>
            current
              ? {
                  ...current,
                  cover_path: coverDraft.path,
                  cover_position_x: coverPosition.x,
                  cover_position_y: coverPosition.y,
                }
              : current,
          );
          if (coverRevision.current === revision) setCoverDirty(false);
        })
        .catch((error: unknown) => {
          setMessage(
            error instanceof Error ? error.message : "Não foi possível salvar a posição da capa.",
          );
        })
        .finally(() => setCoverSaving(false));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [coverDraft, coverDirty, coverPosition, profile, userId]);

  function moveCover(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragPoint.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - dragPoint.current.x) * event.currentTarget.width) / rect.width;
    const dy = ((event.clientY - dragPoint.current.y) * event.currentTarget.height) / rect.height;
    dragPoint.current = { x: event.clientX, y: event.clientY };
    const overflow = canvasOverflow.current;
    if (!overflow.x && !overflow.y) return;
    coverRevision.current += 1;
    setCoverDirty(true);
    setCoverPosition((current) => ({
      x: overflow.x
        ? Math.round(Math.max(0, Math.min(100, current.x - (dx / overflow.x) * 100)))
        : 50,
      y: overflow.y
        ? Math.round(Math.max(0, Math.min(100, current.y - (dy / overflow.y) * 100)))
        : 50,
    }));
  }

  useEffect(() => {
    if (!userId) {
      nav({ to: "/entrar" });
      return;
    }
    void load();
  }, [userId, nav, load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !profile) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const interests = [
        ...new Set(
          String(form.get("interests"))
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ];
      await rest("profiles", `id=eq.${session.user.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          display_name: String(form.get("display_name")).trim(),
          bio: String(form.get("bio")).trim(),
          city: String(form.get("city")).trim(),
          state: String(form.get("state")).trim().toUpperCase(),
          interests,
        }),
      });
      setMessage("Perfil salvo.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function add(event: ChangeEvent<HTMLInputElement>, asCover = false) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session) return;
    setMessage("");
    const type = file.type.startsWith("image/")
      ? "photo"
      : file.type.startsWith("video/")
        ? "video"
        : null;
    if (!type) return setMessage("Envie uma foto ou vídeo compatível.");
    if (type === "photo" && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setMessage("Fotos aceitas: JPG, PNG ou WEBP.");
    }
    if (type === "video" && !["video/mp4", "video/webm"].includes(file.type)) {
      return setMessage("Vídeos aceitos: MP4 ou WEBM.");
    }
    const count = media.filter((item) => item.media_type === type).length;
    const limit = type === "photo" ? limits.photos : limits.videos;
    if (count >= limit) return setMessage("Você atingiu o limite de mídia do seu plano.");
    if (file.size > (type === "photo" ? 15 : 100) * 1024 * 1024) {
      return setMessage("Arquivo excede o tamanho máximo permitido.");
    }

    setBusy(true);
    try {
      const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await upload(path, file);
      try {
        await rest("rpc/register_profile_media", "", {
          method: "POST",
          body: JSON.stringify({
            p_object_path: path,
            p_media_type: type,
            p_mime_type: file.type,
            p_size_bytes: file.size,
          }),
        });
      } catch (error) {
        await removeUpload(path).catch(() => undefined);
        throw error;
      }
      if (type === "photo" && !profile?.avatar_path) {
        await rest("profiles", `id=eq.${session.user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ avatar_path: path }),
        });
      }
      if (asCover) {
        const url = await signedUrl(path);
        setCoverDraft({ path, url });
        setCoverPosition({ x: 50, y: 50 });
        coverRevision.current += 1;
        setCoverDirty(true);
      }
      setMessage(
        asCover
          ? "Arraste a imagem para posicionar a capa. As alterações serão salvas automaticamente."
          : "Mídia enviada.",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Media) {
    if (!session || !window.confirm("Excluir esta mídia do seu perfil?")) return;
    setBusy(true);
    try {
      if (profile?.cover_path === item.object_path) {
        await rest("profiles", `id=eq.${session.user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ cover_path: null }),
        });
      }
      await removeUpload(item.object_path);
      await rest("profile_media", `id=eq.${item.id}`, { method: "DELETE" });
      setMessage("Mídia excluída.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao excluir mídia.");
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(item: Media) {
    if (!session || !profile) return;
    setBusy(true);
    try {
      await rest("profiles", `id=eq.${session.user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatar_path: item.object_path }),
      });
      setProfile({ ...profile, avatar_path: item.object_path });
      setMessage("Foto principal atualizada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível atualizar a foto principal.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setCover(item: Media) {
    if (!profile || item.media_type !== "photo") return;
    const url = urls[item.id];
    if (!url) return setMessage("Não foi possível abrir esta foto para edição.");
    setCoverDraft({ path: item.object_path, url });
    setCoverPosition(
      profile.cover_path === item.object_path
        ? { x: profile.cover_position_x ?? 50, y: profile.cover_position_y ?? 50 }
        : { x: 50, y: 50 },
    );
    coverRevision.current += 1;
    setCoverDirty(profile.cover_path !== item.object_path);
    setMessage(
      "Arraste a imagem para posicionar a capa. As alterações serão salvas automaticamente.",
    );
  }

  if (!session)
    return (
      <main className="auth-page">
        <p>Carregando…</p>
      </main>
    );
  const photoCount = media.filter((item) => item.media_type === "photo").length;
  const videoCount = media.filter((item) => item.media_type === "video").length;
  const limitReached = photoCount >= limits.photos && videoCount >= limits.videos;
  const editorCoverItem = profile?.cover_path
    ? media.find((item) => item.object_path === profile.cover_path)
    : undefined;
  const editorCoverUrl = editorCoverItem ? (urls[editorCoverItem.id] ?? "") : "";

  return (
    <main className="member-page">
      <MemberNav current="perfil">
        <button
          className="button button-outline"
          onClick={() => {
            signOut();
            nav({ to: "/" });
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </MemberNav>
      <div className="member-content">
        <section className="profile-cover-editor">
          {editorCoverUrl && (
            <img
              className="cover-media-img"
              src={editorCoverUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              style={{
                objectPosition: `${profile?.cover_position_x ?? 50}% ${profile?.cover_position_y ?? 50}%`,
              }}
            />
          )}
          <div>
            <span className="auth-kicker">CAPA DO PERFIL</span>
            <p>Personalize a primeira imagem que as pessoas veem no seu perfil.</p>
          </div>
          <label className="button button-outline upload-button">
            Enviar nova capa
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy || photoCount >= limits.photos}
              onChange={(event) => void add(event, true)}
              hidden
            />
          </label>
        </section>
        {coverDraft && (
          <div className="cover-crop-backdrop" role="presentation">
            <section
              className="cover-crop-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cover-crop-title"
            >
              <div className="cover-crop-heading">
                <div>
                  <span className="auth-kicker">AJUSTE DA CAPA</span>
                  <h2 id="cover-crop-title">Posicione sua foto</h2>
                  <p>Arraste a imagem no quadro. O posicionamento é salvo automaticamente.</p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Fechar editor"
                  disabled={coverDirty || coverSaving}
                  onClick={() => setCoverDraft(null)}
                >
                  ×
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={1200}
                height={400}
                className="cover-crop-canvas"
                aria-label="Prévia da capa. Arraste para ajustar o enquadramento."
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragPoint.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerMove={moveCover}
                onPointerUp={() => {
                  dragPoint.current = null;
                }}
                onPointerCancel={() => {
                  dragPoint.current = null;
                }}
              />
              <div className="cover-crop-controls">
                <label>
                  Posição horizontal
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverPosition.x}
                    onChange={(event) => {
                      coverRevision.current += 1;
                      setCoverDirty(true);
                      setCoverPosition((current) => ({
                        ...current,
                        x: Number(event.target.value),
                      }));
                    }}
                  />
                </label>
                <label>
                  Posição vertical
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverPosition.y}
                    onChange={(event) => {
                      coverRevision.current += 1;
                      setCoverDirty(true);
                      setCoverPosition((current) => ({
                        ...current,
                        y: Number(event.target.value),
                      }));
                    }}
                  />
                </label>
              </div>
              <div className="cover-crop-footer">
                <span role="status">
                  {coverSaving || coverDirty
                    ? "Salvando posição…"
                    : "Posição salva automaticamente"}
                </span>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={coverDirty || coverSaving}
                  onClick={() => setCoverDraft(null)}
                >
                  Concluir
                </button>
              </div>
            </section>
          </div>
        )}
        <section className="member-heading">
          <span className="auth-kicker">
            MEU ESPAÇO · PLANO {plan === "premium" ? "PREMIUM" : "FREE"}
          </span>
          <div className="member-avatar">
            {profile?.avatar_path &&
            media.some((item) => item.object_path === profile.avatar_path) ? (
              <img
                src={urls[media.find((item) => item.object_path === profile.avatar_path)!.id]}
                alt="Sua foto de perfil"
              />
            ) : (
              <span>{profile?.display_name?.slice(0, 1) || "S"}</span>
            )}
          </div>
          <h1>Seu perfil</h1>
          <p>Complete suas informações e compartilhe somente o que desejar.</p>
        </section>
        {message && (
          <div className="form-message" role="status">
            {message}
            {message.toLowerCase().includes("limite") && <a href="/planos">Conhecer Premium</a>}
          </div>
        )}
        {profile && (
          <form className="profile-form" onSubmit={save}>
            <label>
              Nome de exibição
              <input
                name="display_name"
                defaultValue={profile.display_name}
                required
                maxLength={40}
              />
            </label>
            <label>
              Bio
              <textarea name="bio" defaultValue={profile.bio} maxLength={500} rows={4} />
            </label>
            <div className="profile-fields">
              <label>
                Cidade
                <input name="city" defaultValue={profile.city} maxLength={80} />
              </label>
              <label>
                Estado
                <input name="state" defaultValue={profile.state} maxLength={2} />
              </label>
            </div>
            <label>
              Interesses, separados por vírgula
              <input name="interests" defaultValue={(profile.interests ?? []).join(", ")} />
            </label>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar perfil"}
            </button>
          </form>
        )}
        <section className="media-manager">
          <div>
            <h2>Sua galeria</h2>
            <p>Seus limites são definidos pelo plano no servidor.</p>
          </div>
          <div className="media-count">
            <span>
              <ImagePlus size={16} /> {photoCount}/{limits.photos} fotos
            </span>
            <span>
              <Video size={16} /> {videoCount}/{limits.videos} vídeos
            </span>
          </div>
          <div className="media-progress-list">
            <label>
              Fotos
              <progress
                value={Math.min(photoCount, limits.photos)}
                max={Math.max(1, limits.photos)}
              />
            </label>
            <label>
              Vídeos
              <progress
                value={Math.min(videoCount, limits.videos)}
                max={Math.max(1, limits.videos)}
              />
            </label>
          </div>
          {(photoCount >= Math.max(1, limits.photos - 1) ||
            videoCount >= Math.max(1, limits.videos - 1)) && (
            <p className="media-limit-message">
              {limitReached ? "Limite atingido." : "Você está chegando ao limite do seu plano."}
              {plan === "free" && <a href="/planos">Conhecer Premium</a>}
            </p>
          )}
          <label
            className={`button button-primary upload-button${limitReached ? " is-disabled" : ""}`}
          >
            {busy
              ? "Enviando…"
              : limitReached
                ? "Limite de mídia atingido"
                : "Adicionar foto ou vídeo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              disabled={busy || limitReached}
              onChange={add}
              hidden
            />
          </label>
          <div className="media-grid">
            {media.map((item) => (
              <article key={item.id} className="media-tile">
                {item.media_type === "photo" ? (
                  <img src={urls[item.id]} alt="Mídia do perfil" />
                ) : (
                  <video src={urls[item.id]} controls playsInline preload="none" />
                )}
                <div className="media-actions">
                  {item.media_type === "photo" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Definir foto de perfil"
                        title="Definir como foto de perfil"
                        onClick={() => void setPrimary(item)}
                      >
                        Perfil
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Definir foto de capa"
                        title="Definir como capa do perfil"
                        onClick={() => void setCover(item)}
                      >
                        Capa
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Excluir mídia"
                    onClick={() => void remove(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
