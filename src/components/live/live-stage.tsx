import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Heart, Radio, Square, UserPlus, Users, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { useLive } from "@/components/live/live-provider";
import { rest } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LiveChat } from "@/components/live/live-chat";
import { LiveActions } from "@/components/live/live-actions";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Immersive stage. A double tap on the video fires a like straight away: the
 * heart renders instantly at the tap point and the persisted `live_interactions`
 * row follows, so the UI never waits on the network.
 */
export function LiveStage() {
  const {
    active,
    leaveLive,
    audioMuted,
    toggleAudioMute,
    joined,
    isHost,
    connection,
    metrics,
    sendReaction,
    floating,
    reduceMotion,
    dismissFloating,
    setPanel,
  } = useLive();

  const videoRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [aspect, setAspect] = useState<"portrait" | "landscape">("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const remoteHostRef = useRef<HTMLDivElement>(null);

  const handleDoubleTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const node = videoRef.current;
    if (!node || (event.target instanceof Element && event.target.closest("button,select,input"))) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    const now = Date.now();
    if (now - lastTapRef.current > 400) {
      lastTapRef.current = now;
      if (pendingRef.current) window.clearTimeout(pendingRef.current);
      pendingRef.current = window.setTimeout(() => {
        pendingRef.current = null;
      }, 400);
      return;
    }
    lastTapRef.current = 0;
    if (pendingRef.current) {
      window.clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
    sendReaction("heart");
    if (!reduceMotion) {
      node.style.setProperty("--tap-x", `${x}px`);
      node.style.setProperty("--tap-y", `${y}px`);
      node.classList.remove("is-tapped");
      void node.offsetWidth;
      node.classList.add("is-tapped");
    }
  }, [sendReaction, reduceMotion]);

  useEffect(() => () => {
    if (pendingRef.current) window.clearTimeout(pendingRef.current);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === videoRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const target = videoRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch {
      /* CSS still keeps the stage full-viewport while a live is active. */
    }
  }, []);

  const toggleFollow = useCallback(async () => {
    if (!active) return;
    try {
      await rest("follows", "", {
        method: "POST",
        body: JSON.stringify({ following_id: active.host_id }),
      });
      setFollowing(true);
    } catch {
      setFollowing(false);
    }
  }, [active]);

  const connectionCopy: Record<string, string> = {
    connecting: "Conectando à transmissão…",
    reconnecting: "Reconectando à transmissão…",
    ended: "A transmissão foi encerrada.",
    disconnected: "Conexão com a live interrompida.",
  };

  return (
    <section className={cn("live-stage", joined ? "is-live" : "is-idle")} aria-label="Transmissão ao vivo">
      <div
        ref={videoRef}
        className={cn("live-stage-video", `is-${aspect}`, joined && "is-immersive")}
        onDoubleClick={handleDoubleTap}
        data-testid="live-stage-video"
      >
        <div
          id="live-local-video"
          className={cn("live-local-video", isHost ? "" : "is-hidden")}
          aria-hidden={!isHost}
        />
        <div className="live-anchor-video" ref={remoteHostRef} />

        {!joined && (
          <div className="live-stage-placeholder">
            <Radio size={34} aria-hidden="true" />
            <h2>Lives da comunidade</h2>
            <p>Assista a uma transmissão ao vivo ou inicie a sua.</p>
          </div>
        )}

        {connectionCopy[connection] && (
          <p className="live-stage-status" role="status">
            {connectionCopy[connection]}
          </p>
        )}

        {/* Top layer: identity, live badge, viewers and exit. */}
        {joined && active && (
          <div className="live-stage-top">
            <div className="live-stage-identity">
              <span className="live-stage-avatar" aria-hidden="true">
                {(active.title || "S").slice(0, 1).toUpperCase()}
              </span>
              <span className="live-stage-names">
                <b>{active.title}</b>
                <small>
                  <span className="live-live-badge">
                    <i aria-hidden="true" /> AO VIVO
                  </span>
                </small>
              </span>
            </div>

            <div className="live-stage-top-actions">
              <button type="button" className="live-viewer-counter" onClick={() => void toggleAudioMute()} aria-label={audioMuted ? (isHost ? "Ativar microfone" : "Ativar áudio da live") : (isHost ? "Silenciar microfone" : "Silenciar áudio da live")} title={isHost ? "Silenciar/ativar microfone" : "Silenciar/ativar áudio"}>
                {audioMuted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
              </button>
              <label className="live-aspect-control"><span className="sr-only">Proporção do vídeo</span><select value={aspect} onChange={(event) => setAspect(event.target.value as "portrait" | "landscape")} aria-label="Proporção do vídeo"><option value="portrait">9:16</option><option value="landscape">16:9</option></select></label>
              <button type="button" className="live-viewer-counter" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Sair da tela cheia" : "Exibir em tela cheia"} title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
              <button
                type="button"
                className="live-viewer-counter"
                onClick={() => setPanel("viewers")}
                aria-label={`${metrics.current_viewers} pessoas assistindo. Ver lista`}
              >
                <Eye size={15} aria-hidden="true" />
                <span>{metrics.current_viewers.toLocaleString("pt-BR")}</span>
              </button>
              {!isHost && !following && (
                <button type="button" className="live-follow-button" onClick={toggleFollow}>
                  <UserPlus size={15} aria-hidden="true" />
                  Seguir
                </button>
              )}
              <button
                type="button"
                className="live-exit-button"
                onClick={() => isHost ? setPanel("moderation") : void leaveLive()}
                aria-label={isHost ? "Opções da transmissão" : "Sair da live"}
              >
                <Square size={14} aria-hidden="true" />
                {isHost ? "Gerenciar" : "Sair"}
              </button>
            </div>
          </div>
        )}

        {/* Reaction layer. */}
        <div className="live-reaction-layer" aria-hidden="true">
          {floating.map((item) => (
            <span
              key={item.key}
              className={cn("live-reaction-piece", reduceMotion && "is-static")}
              style={{
                left: `${item.leftPct}%`,
                "--piece-scale": item.scale,
                "--piece-drift": `${item.driftPx}px`,
              } as React.CSSProperties}
              onAnimationEnd={() => dismissFloating(item.key)}
            >
              {item.emoji}
            </span>
          ))}
          <span className="live-tap-heart" aria-hidden="true">❤️</span>
        </div>

        {/* Bottom scrim carries the like counter and total interactions. */}
        {joined && (
          <div className="live-stage-lower-overlay">
            <LiveChat />
            <LiveActions />
          </div>
        )}
        {joined && (
          <div className="live-stage-bottom">
            <span className="live-like-chip">
              <Heart size={14} aria-hidden="true" />
              {compact.format(metrics.likes || 0)}
            </span>
            <span className="live-gift-chip">
              🎁 {compact.format(metrics.gifts || 0)}
            </span>
          </div>
        )}
      </div>

      {!joined && (
        <p className="live-stage-note">
          <Users size={15} aria-hidden="true" />
          Ao transmitir, o navegador pedirá acesso à câmera e ao microfone.
        </p>
      )}
    </section>
  );
}
