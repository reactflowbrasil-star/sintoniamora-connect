import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Heart, Radio, Square, UserPlus, Users } from "lucide-react";
import { useLive } from "@/components/live/live-provider";
import { rest } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Immersive stage. A double tap on the video fires a like straight away: the
 * heart renders instantly at the tap point and the persisted `live_interactions`
 * row follows, so the UI never waits on the network.
 */
export function LiveStage() {
  const {
    active,
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

  const stageRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const [following, setFollowing] = useState(false);

  const remoteHostRef = useRef<HTMLDivElement>(null);

  const handleDoubleTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const node = stageRef.current;
    if (!node) return;
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
        ref={stageRef}
        className="live-stage-video"
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
                onClick={() => setPanel(isHost ? "moderation" : null)}
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