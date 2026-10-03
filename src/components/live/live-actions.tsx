import { useCallback } from "react";
import { Gift, Heart, Share2, MoreHorizontal, Settings2 } from "lucide-react";
import { useLive } from "@/components/live/live-provider";
import { cn } from "@/lib/utils";

/** Bottom action bar: reactions, gifts, sharing and the overflow menu. */
export function LiveActions() {
  const {
    joined,
    isHost,
    panel,
    setPanel,
    shareLive,
    sendReaction,
    metrics,
    reduceMotion,
  } = useLive();

  const onShare = useCallback(async () => {
    const result = await shareLive();
    if (result === "failed") setPanel("more");
  }, [shareLive, setPanel]);

  if (!joined) return null;

  return (
    <div className="live-actions" role="group" aria-label="Ações da transmissão">
      <button
        type="button"
        className={cn("live-action", panel === "gifts" && "is-active")}
        onClick={() => setPanel(panel === "gifts" ? null : "gifts")}
        disabled={isHost}
        aria-expanded={panel === "gifts"}
        aria-label="Enviar presente"
      >
        <Gift size={20} aria-hidden="true" />
        <span>Presentes</span>
      </button>

      <button
        type="button"
        className="live-action"
        onClick={() => sendReaction("heart")}
        aria-label={`Curtir a live. ${metrics.likes} curtidas`}
      >
        <Heart size={20} aria-hidden="true" className={reduceMotion ? "" : "live-action-beat"} />
        <span>Curtir</span>
      </button>

      <button type="button" className="live-action" onClick={onShare} aria-label="Compartilhar live">
        <Share2 size={20} aria-hidden="true" />
        <span>Compartilhar</span>
      </button>

      <button
        type="button"
        className={cn("live-action", panel === "more" && "is-active")}
        onClick={() => setPanel(panel === "more" ? null : "more")}
        aria-expanded={panel === "more"}
        aria-label="Mais opções"
      >
        <MoreHorizontal size={20} aria-hidden="true" />
        <span>Mais</span>
      </button>
    </div>
  );
}

/** Overflow sheet: settings, moderation entry point and reduced-motion note. */
export function LiveMoreSheet() {
  const {
    panel,
    setPanel,
    isHost,
    joined,
    reduceMotion,
    setPendingEnd,
    pendingEnd,
    endLive,
  } = useLive();

  if (panel !== "more" || !joined) return null;

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Mais opções da live">
      <div className="live-sheet-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>Opções da live</h2>
          <button type="button" onClick={() => setPanel(null)} aria-label="Fechar">×</button>
        </header>

        <ul className="live-sheet-list">
          <li>
            <button
              type="button"
              onClick={() => setPanel(isHost ? "moderation" : "viewers")}
            >
              <Settings2 size={17} aria-hidden="true" />
              {isHost ? "Gerenciar espectadores" : "Pessoas assistindo"}
            </button>
          </li>
          <li className="live-sheet-note">
            Animações {reduceMotion ? "reduzidas (seu sistema pede)" : "ativadas"}.
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Confirmation before the host ends the broadcast. */
export function LiveEndConfirm() {
  const { pendingEnd, setPendingEnd, endLive, busy } = useLive();
  if (!pendingEnd) return null;

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Encerrar transmissão">
      <div className="live-sheet-backdrop" onClick={() => setPendingEnd(false)} aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>Encerrar transmissão?</h2>
        </header>
        <p className="live-sheet-text">
          Todos sairão da live e o resumo da transmissão será exibido para você.
        </p>
        <div className="live-sheet-actions">
          <button type="button" className="button button-outline" onClick={() => setPendingEnd(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void endLive()}
            disabled={busy}
          >
            Encerrar live
          </button>
        </div>
      </div>
    </div>
  );
}