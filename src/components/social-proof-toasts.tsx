import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Crown, Heart, MessageCircle, Sprout, X } from "lucide-react";

type Tone = "premium" | "join" | "like" | "message";

type Alert = {
  name: string;
  city: string;
  action: string;
  tone: Tone;
};

/** Illustrative social proof. Swap for a real "recent activity" feed when one exists. */
const ALERTS: Alert[] = [
  { name: "Ana Carolina", city: "São Paulo", action: "acabou de assinar o plano Premium", tone: "premium" },
  { name: "Marina", city: "Rio de Janeiro", action: "entrou na comunidade agora", tone: "join" },
  { name: "Juliana", city: "Belo Horizonte", action: "acabou de assinar o plano Premium", tone: "premium" },
  { name: "Rafael", city: "Curitiba", action: "começou a seguir novas pessoas", tone: "like" },
  { name: "Patrícia", city: "Salvador", action: "encontrou uma nova sintonia hoje", tone: "like" },
  { name: "Camila", city: "Porto Alegre", action: "acabou de assinar o plano Premium", tone: "premium" },
  { name: "Beatriz", city: "Fortaleza", action: "entrou na comunidade agora", tone: "join" },
  { name: "Larissa", city: "Recife", action: "recebeu novas mensagens", tone: "message" },
  { name: "Fernanda", city: "Brasília", action: "acabou de assinar o plano Premium", tone: "premium" },
  { name: "Aline", city: "Florianópolis", action: "atualizou o próprio perfil", tone: "join" },
  { name: "Tatiane", city: "Goiânia", action: "começou a seguir novas pessoas", tone: "like" },
  { name: "Renata", city: "Campinas", action: "recebeu novas mensagens", tone: "message" },
  { name: "Vanessa", city: "Manaus", action: "acabou de assinar o plano Premium", tone: "premium" },
  { name: "Débora", city: "Vitória", action: "entrou na comunidade agora", tone: "join" },
];

const ICONS = {
  premium: Crown,
  join: Sprout,
  like: Heart,
  message: MessageCircle,
} as const;

const MIN_DELAY = 10_000;
const MAX_DELAY = 60_000;
const VISIBLE_MS = 6_500;

const HIDDEN_PREFIXES = ["/entrar", "/cadastro", "/confirmar-email", "/live", "/admin"];

export function SocialProofToasts() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [hidden, setHidden] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const index = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  const randomDelay = useCallback(
    () => MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY),
    [],
  );

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // Advance without repeating the previous message.
      index.current = (index.current + 1 + Math.floor(Math.random() * (ALERTS.length - 1))) % ALERTS.length;
      setAlert(ALERTS[index.current] ?? ALERTS[0]!);
      setHidden(false);
      hideTimer.current = window.setTimeout(() => setHidden(true), VISIBLE_MS);
      schedule();
    }, randomDelay());
  }, [randomDelay]);

  useEffect(() => {
    if (dismissed) return;
    const path = window.location.pathname;
    if (HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      window.clearTimeout(timer.current);
      setHidden(true);
      return;
    }
    schedule();
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, [dismissed, schedule]);

  if (dismissed || !alert) return null;
  const Icon = ICONS[alert.tone] ?? BadgeCheck;
  const initials = alert.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <aside
      className={`social-proof-toast${hidden ? " is-hidden" : ""}`}
      aria-live="polite"
      aria-hidden={hidden}
    >
      <span className="social-proof-avatar" aria-hidden="true">
        {initials}
        <Icon className="social-proof-badge" size={13} />
      </span>
      <div className="social-proof-text">
        <b>
          {alert.name} <span>· {alert.city}</span>
        </b>
        <p>{alert.action}</p>
      </div>
      <button
        type="button"
        className="social-proof-close"
        aria-label="Ocultar alertas"
        onClick={() => {
          setDismissed(true);
          window.clearTimeout(timer.current);
          window.clearTimeout(hideTimer.current);
        }}
      >
        <X size={15} />
      </button>
    </aside>
  );
}
