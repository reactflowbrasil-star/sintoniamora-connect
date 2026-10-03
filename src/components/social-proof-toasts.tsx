import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  Crown,
  Eye,
  Heart,
  MessageCircle,
  Search,
  Sparkles,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

export type PushType =
  | "like"
  | "view"
  | "message"
  | "new-user"
  | "searching"
  | "premium"
  | "activity";

/** A notification descriptor — ready to be fed by real backend events later. */
export type ActivityPush = {
  id: number;
  type: PushType;
  icon: LucideIcon;
  /** Member involved, when the event has one. */
  name?: string;
  /** What happened, without the name (e.g. "curtiu uma foto."). */
  action: string;
  /** Optional object of the action (e.g. "uma foto"). */
  target?: string;
  /** Human-readable relative time (e.g. "agora mesmo"). */
  timestamp: string;
  /** Rendered headline: `name action` or just `action`. */
  title: string;
};

type Template = {
  type: PushType;
  icon: LucideIcon;
  action: string;
  /** Prefix a random member name to the action. */
  withName?: boolean;
  target?: string;
  /** Replace a leading number placeholder for activity messages. */
  withCount?: boolean;
};

/* --------------------------------------------------------------------------
 * Content pools — demo copy. Swap `TEMPLATES`/`NAMES` for real events once the
 * backend emits likes, messages, sign-ups, etc. in real time.
 * ------------------------------------------------------------------------ */
const TEMPLATES: Template[] = [
  // ❤️ Curtidas
  { type: "like", icon: Heart, action: "curtiu uma foto.", withName: true, target: "uma foto" },
  { type: "like", icon: Heart, action: "curtiu uma publicação.", withName: true, target: "uma publicação" },
  { type: "like", icon: Heart, action: "recebeu uma nova curtida.", withName: true, target: "uma curtida" },
  // 👀 Visualizações
  { type: "view", icon: Eye, action: "Alguém acabou de visualizar um perfil." },
  { type: "view", icon: Eye, action: "Um perfil recebeu novas visualizações." },
  { type: "view", icon: Eye, action: "visitou um perfil agora.", withName: true, target: "um perfil" },
  // 💬 Interações
  { type: "message", icon: MessageCircle, action: "iniciou uma nova conversa.", withName: true },
  { type: "message", icon: MessageCircle, action: "enviou uma nova mensagem.", withName: true },
  { type: "message", icon: MessageCircle, action: "adicionou um perfil aos favoritos.", withName: true },
  // ✨ Novos usuários
  { type: "new-user", icon: Sparkles, action: "Novo perfil entrou na comunidade." },
  { type: "new-user", icon: UserPlus, action: "acabou de criar seu perfil.", withName: true },
  { type: "new-user", icon: Sparkles, action: "Novo usuário ativo na sua região." },
  // 🔎 Procurando conexões
  { type: "searching", icon: Search, action: "está procurando mulheres para conversar.", withName: true },
  { type: "searching", icon: Search, action: "está procurando homens na sua região.", withName: true },
  { type: "searching", icon: Search, action: "Um casal está procurando novas conexões." },
  { type: "searching", icon: Search, action: "está procurando pessoas com interesses em comum.", withName: true },
  // 💎 Planos
  { type: "premium", icon: Crown, action: "Um usuário acabou de assinar o plano Premium." },
  { type: "premium", icon: Crown, action: "ativou o Premium.", withName: true },
  { type: "premium", icon: Crown, action: "Novo membro Premium na comunidade." },
  // 🔥 Atividade
  { type: "activity", icon: Activity, action: "{n} pessoas estão online agora.", withCount: true },
  { type: "activity", icon: Activity, action: "Novas pessoas estão explorando perfis." },
  { type: "activity", icon: Activity, action: "Um novo perfil ficou disponível." },
];

const NAMES = [
  "Mariana", "Camila", "Ana", "Juliana", "Bruna", "Amanda", "Larissa", "Patrícia",
  "Renata", "Fernanda", "Tatiane", "Aline", "Vanessa", "Débora", "Rafael", "Lucas",
  "Carlos", "Marcos", "Bruno", "Diego", "Thiago", "Gabriel", "Felipe", "Rodrigo",
];

const TIMESTAMPS = ["agora mesmo", "agora", "há poucos segundos", "há instantes", "há 1 min"];

const ACCENTS: Record<PushType, string> = {
  like: "#ff5a8c",
  view: "#8fb7ff",
  message: "#6fe0c4",
  "new-user": "#ffd27a",
  searching: "#c99bff",
  premium: "#f6c177",
  activity: "#ff8f5a",
};

const MIN_DELAY = 8_000;
const MAX_DELAY = 20_000;
const VISIBLE_MIN = 4_000;
const VISIBLE_MAX = 6_000;

/** Routes where the push would cover controls — keep it out of the way. */
const HIDDEN_PREFIXES = ["/entrar", "/cadastro", "/confirmar-email", "/live", "/admin"];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

function buildPush(index: number): ActivityPush {
  const template = TEMPLATES[index]!;
  const name = template.withName ? pick(NAMES) : undefined;
  let action = template.action;
  if (template.withCount) {
    action = action.replace("{n}", String(18 + Math.floor(Math.random() * 90)));
  }
  return {
    id: Date.now(),
    type: template.type,
    icon: template.icon,
    action,
    timestamp: pick(TIMESTAMPS),
    title: name ? `${name} ${action}` : action,
    ...(name !== undefined ? { name } : {}),
    ...(template.target !== undefined ? { target: template.target } : {}),
  };
}

export function SocialProofToasts() {
  const [push, setPush] = useState<ActivityPush | null>(null);
  const [hidden, setHidden] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const lastIndex = useRef(-1);
  const timer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (dismissed) return;
    const path = window.location.pathname;
    if (HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      window.clearTimeout(timer.current);
      setHidden(true);
      return;
    }

    const schedule = () => {
      timer.current = window.setTimeout(() => {
        // Never repeat the same message twice in a row.
        let next = Math.floor(Math.random() * TEMPLATES.length);
        if (next === lastIndex.current) next = (next + 1) % TEMPLATES.length;
        lastIndex.current = next;
        setPush(buildPush(next));
        setHidden(false);
        hideTimer.current = window.setTimeout(
          () => setHidden(true),
          VISIBLE_MIN + Math.random() * (VISIBLE_MAX - VISIBLE_MIN),
        );
        schedule();
      }, MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY));
    };

    schedule();
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, [dismissed]);

  if (dismissed || !push) return null;
  const Icon = push.icon;

  return (
    <aside
      className={`activity-push${hidden ? " is-hidden" : ""}`}
      style={{ "--push-accent": ACCENTS[push.type] } as CSSProperties}
      aria-live="polite"
      aria-hidden={hidden}
      title="Atividade demonstrativa — será substituída por eventos reais quando houver backend em tempo real"
    >
      <span className="activity-push-icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <div className="activity-push-body">
        <b className="activity-push-title">{push.title}</b>
        <span className="activity-push-meta">
          <time>{push.timestamp}</time>
          <em>demo</em>
        </span>
      </div>
      <button
        type="button"
        className="activity-push-close"
        aria-label="Desativar alertas"
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
