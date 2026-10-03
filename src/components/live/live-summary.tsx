import { useLive } from "@/components/live/live-provider";
import { Clock, Eye, Gift, Heart, MessageCircle, TrendingUp, X } from "lucide-react";

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

/** Post-broadcast recap. Every figure comes from the server metrics RPC. */
export function LiveSummaryCard() {
  const { summary, leaveLive } = useLive();
  if (!summary) return null;

  const rows = [
    { icon: Eye, label: "Visualizações", value: summary.views.toLocaleString("pt-BR") },
    { icon: TrendingUp, label: "Pico simultâneo", value: summary.peak.toLocaleString("pt-BR") },
    { icon: Heart, label: "Curtidas", value: summary.likes.toLocaleString("pt-BR") },
    { icon: MessageCircle, label: "Comentários", value: summary.messages.toLocaleString("pt-BR") },
    { icon: Gift, label: "Presentes", value: summary.gifts.toLocaleString("pt-BR") },
    { icon: Clock, label: "Tempo transmitido", value: formatDuration(summary.endedAt - summary.startedAt) },
  ];

  return (
    <div className="live-sheet" role="dialog" aria-modal="true" aria-label="Resumo da transmissão">
      <div className="live-sheet-backdrop" aria-hidden="true" />
      <div className="live-sheet-panel">
        <header className="live-sheet-header">
          <h2>Resumo da sua live</h2>
          <button type="button" onClick={() => void leaveLive()} aria-label="Fechar resumo">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <ul className="live-summary-grid">
          {rows.map((row) => (
            <li key={row.label}>
              <row.icon size={17} aria-hidden="true" />
              <span>{row.label}</span>
              <b>{row.value}</b>
            </li>
          ))}
        </ul>

        {summary.points > 0 && (
          <p className="live-summary-points">
            Pontos acumulados no seu saldo de live: <b>{summary.points.toLocaleString("pt-BR")}</b>
          </p>
        )}

        <div className="live-sheet-actions">
          <button type="button" className="button button-primary" onClick={() => void leaveLive()}>
            Voltar às lives
          </button>
        </div>
      </div>
    </div>
  );
}