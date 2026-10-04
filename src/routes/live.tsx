import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, LoaderCircle, Radio, Eye } from "lucide-react";
import { getSession } from "@/lib/supabase";
import { LiveProvider, useLive } from "@/components/live/live-provider";
import { LiveStage } from "@/components/live/live-stage";
import { LiveEndConfirm, LiveMoreSheet } from "@/components/live/live-actions";
import { LiveGiftsSheet, LiveModerationSheet, LiveViewersSheet } from "@/components/live/live-sheets";
import { LiveSummaryCard } from "@/components/live/live-summary";

export const Route = createFileRoute("/live")({ component: Live });

function LiveRoom() {
  const {
    uid,
    lives,
    active,
    joined,
    busy,
    error,
    notice,
    title,
    setTitle,
    startLive,
    joinLive,
    connection,
  } = useLive();

  const nav = useNavigate();

  // Redirect after mount instead of during render so the server-rendered page
  // still paints the shell for signed-out visitors.
  useEffect(() => {
    if (!uid) void nav({ to: "/entrar" });
  }, [uid, nav]);

  return (
    <main className="live-experience" data-connection={connection}>
      <div className="live-experience-content">
        <LiveStage />

        {(error || notice) && (
          <p className={error ? "live-error" : "live-notice"} role="status">
            {error || notice}
          </p>
        )}

        <div className="live-side">
          {joined ? (
            <>
              <p className="live-live-hint">A transmissão está em tela cheia. O chat e as reações ficam sobre o vídeo.</p>
            </>
          ) : (
            <>
              <form id="live-start" className="live-start-form" onSubmit={startLive}>
                <h2>Iniciar transmissão</h2>
                <label htmlFor="live-title">Título da live</label>
                <input
                  id="live-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  minLength={3}
                  maxLength={100}
                  placeholder="Sobre o que você quer conversar?"
                  required
                />
                <button className="button button-primary" aria-busy={busy} disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={17} aria-hidden="true" />
                  ) : (
                    <Radio size={17} aria-hidden="true" />
                  )}
                  {busy ? "Preparando transmissão…" : "Iniciar com câmera"}
                </button>
                <small>Para transmitir, use HTTPS e permita câmera e microfone.</small>
              </form>

              <section className="live-directory" id="live-directory" aria-label="Transmissões ativas">
                <h2>
                  Transmissões ativas <span>{lives.length}</span>
                </h2>
                {lives.map((live) => (
                  <article className="live-list-item" key={live.id}>
                    <div>
                      <b>{live.title}</b>
                      <small>
                        {live.host_id === uid ? "Você" : "Membro da comunidade"}
                      </small>
                    </div>
                    {live.host_id !== uid ? (
                      <button
                        className="button button-primary"
                        disabled={busy}
                        onClick={() => void joinLive(live)}
                      >
                        {busy ? "Conectando…" : "Assistir"}
                      </button>
                    ) : (
                      <span className="live-list-badge">
                        <Eye size={13} aria-hidden="true" /> sua live
                      </span>
                    )}
                  </article>
                ))}
                {!lives.length && <p>Ninguém está ao vivo neste momento.</p>}
              </section>
            </>
          )}
        </div>
      </div>

      <LiveViewersSheet />
      <LiveModerationSheet />
      <LiveGiftsSheet />
      <LiveMoreSheet />
      <LiveEndConfirm />
      <LiveSummaryCard />
    </main>
  );
}

function Live() {
  return (
    <LiveProvider>
      <header className="live-experience-header">
        <a href="/dashboard" aria-label="Voltar ao painel">
          <ArrowLeft size={19} aria-hidden="true" />
        </a>
        <img src="/sintoniamora-logo-horizontal.webp" alt="sexflow" />
        <span>
          <span className="live-pulse" aria-hidden="true" /> Lives
        </span>
      </header>
      <LiveRoom />
    </LiveProvider>
  );
}
