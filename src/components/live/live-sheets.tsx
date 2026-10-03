import { useLive } from "@/components/live/live-provider";
import { Ban, MicOff, UserMinus, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Who is watching. Presence rows are read from the server, never guessed. */
export function LiveViewersSheet() {
  const { panel, setPanel, viewers, metrics, active } = useLive();
  if (panel !== "viewers" || !active) return null;

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Pessoas assistindo">
      <div className="live-sheet-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>Pessoas assistindo</h2>
          <button type="button" onClick={() => setPanel(null)} aria-label="Fechar">×</button>
        </header>

        <p className="live-sheet-text">
          {metrics.current_viewers.toLocaleString("pt-BR")} assistindo agora
          {metrics.unique_viewers > 0 && ` · ${metrics.unique_viewers.toLocaleString("pt-BR")} pessoas no total`}
        </p>

        {viewers.length === 0 ? (
          <p className="live-sheet-empty">
            {metrics.current_viewers > 0
              ? "A lista de nomes fica visível apenas para quem transmite."
              : "Ninguém assistindo neste momento."}
          </p>
        ) : (
          <ul className="live-sheet-list">
            {viewers.map((viewer) => (
              <li key={viewer.userId} className="live-viewer-row">
                <span className="live-viewer-avatar" aria-hidden="true">
                  {(viewer.displayName || "M").slice(0, 1).toUpperCase()}
                </span>
                <span className="live-viewer-name">{viewer.displayName || "Membro"}</span>
                {viewer.role === "host" && (
                  <span className="live-viewer-role">
                    <ShieldCheck size={13} aria-hidden="true" />
                    Transmissor
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const INTENTS = [
  { action: "mute_chat", label: "Silenciar no chat", icon: MicOff, tone: "mute" },
  { action: "remove_from_live", label: "Remover da live", icon: UserMinus, tone: "remove" },
  { action: "block_from_live", label: "Bloquear", icon: Ban, tone: "block" },
] as const;

/** Host moderation tools. Every action is validated by the server RPC. */
export function LiveModerationSheet() {
  const {
    panel,
    setPanel,
    viewers,
    active,
    isHost,
    moderation,
    setModeration,
    runModeration,
    setPendingEnd,
  } = useLive();

  if (panel !== "moderation" || !active) return null;

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Gerenciar live">
      <div className="live-sheet-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>{isHost ? "Gerenciar live" : "Opções"}</h2>
          <button type="button" onClick={() => setPanel(null)} aria-label="Fechar">×</button>
        </header>

        {moderation ? (
          <div className="live-confirm">
            <p>
              Confirmar: <strong>{moderation.targetName}</strong> —{" "}
              {INTENTS.find((intent) => intent.action === moderation.action)?.label.toLowerCase()}?
            </p>
            <div className="live-sheet-actions">
              <button type="button" className="button button-outline" onClick={() => setModeration(null)}>
                Cancelar
              </button>
              <button type="button" className="button button-primary" onClick={() => void runModeration()}>
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <>
            {isHost ? (
              <>
                <p className="live-sheet-text">
                  Escolha uma ação para alguém que assistiu ou falou na live.
                </p>
                {viewers.length === 0 ? (
                  <p className="live-sheet-empty">Ninguém participou da live ainda.</p>
                ) : (
                  <ul className="live-sheet-list">
                    {viewers.map((viewer) => (
                      <li key={viewer.userId} className="live-moderation-row">
                        <span className="live-viewer-name">{viewer.displayName || "Membro"}</span>
                        <span className="live-moderation-actions">
                          {INTENTS.map((intent) => (
                            <button
                              key={intent.action}
                              type="button"
                              className={cn("live-moderation-button", `is-${intent.tone}`)}
                              onClick={() =>
                                setModeration({
                                  action: intent.action,
                                  targetId: viewer.userId,
                                  targetName: viewer.displayName || "Membro",
                                })
                              }
                              aria-label={`${intent.label}: ${viewer.displayName}`}
                            >
                              <intent.icon size={15} aria-hidden="true" />
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="live-end-button"
                  onClick={() => {
                    setPanel(null);
                    setPendingEnd(true);
                  }}
                >
                  Encerrar live
                </button>
              </>
            ) : (
              <p className="live-sheet-empty">
                Apenas o transmissor pode gerenciar espectadores.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Gift catalogue, driven by the real `live_gifts` rows. */
export function LiveGiftsSheet() {
  const { panel, setPanel, gifts, sendGift, isHost, busy } = useLive();
  if (panel !== "gifts") return null;

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Presentes">
      <div className="live-sheet-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>Presentes</h2>
          <button type="button" onClick={() => setPanel(null)} aria-label="Fechar">×</button>
        </header>

        {isHost ? (
          <p className="live-sheet-empty">Você está transmitindo e não pode enviar presentes.</p>
        ) : gifts.length === 0 ? (
          <p className="live-sheet-empty">Nenhum presente disponível no momento.</p>
        ) : (
          <ul className="live-gift-grid">
            {gifts.map((gift) => (
              <li key={gift.id}>
                <button
                  type="button"
                  className="live-gift-card"
                  onClick={() => void sendGift(gift)}
                  disabled={busy}
                >
                  <span className="live-gift-emoji" aria-hidden="true">{gift.emoji}</span>
                  <b>{gift.name}</b>
                  <small>{gift.points} pontos</small>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="live-sheet-footnote">
          <Users size={13} aria-hidden="true" />
          Pontos são recompensas virtuais da comunidade e não representam dinheiro.
        </p>
      </div>
    </div>
  );
}