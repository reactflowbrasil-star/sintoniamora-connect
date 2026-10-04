import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, Heart, UserPlus, Radio } from "lucide-react";
import { getSession, getValidSession, rest, rpc } from "@/lib/supabase";

type Notice = { id: string; kind: string; created_at: string; actor_id?: string | null };
type Message = { id: string; created_at: string; sender_id: string };
type UnreadRow = { conversation_id: string; unread_count: number };

type Alert = { id: string; text: string; icon: "message" | "notification" };

const POLL_MS = 8_000;

const KIND_LABEL: Record<string, string> = {
  message: "Nova mensagem",
  like: "Recebeu um like",
  comment: "Novo comentário",
  follow: "Novo seguidor",
  live: "Alguém começou uma live",
};

function iconFor(text: string) {
  if (/mensagem/i.test(text)) return <MessageCircle size={16} />;
  if (/like/i.test(text)) return <Heart size={16} />;
  if (/seguidor/i.test(text)) return <UserPlus size={16} />;
  if (/live/i.test(text)) return <Radio size={16} />;
  return <Bell size={16} />;
}

/**
 * Audible alert for anything that lands on the member's dashboard.
 *
 * The tone is synthesised with WebAudio instead of shipping an audio file:
 * nothing to download, no cache to bust, and it stays silent until the browser
 * has seen a real gesture — autoplay policy blocks sound otherwise, so the
 * AudioContext is only created and resumed on the first user interaction.
 */
function createChime() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  let context: AudioContext | null = null;
  let unlocked = false;

  return {
    unlock() {
      if (unlocked) return;
      try {
        context ??= new Ctor();
        if (context.state === "suspended") void context.resume();
        unlocked = true;
      } catch {
        unlocked = false;
      }
    },
    play() {
      if (!context || context.state !== "running") return;
      // Two rising notes: reads as a notification, not an error.
      const now = context.currentTime;
      for (const [index, frequency] of [880, 1174.66].entries()) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.26);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.14);
        oscillator.stop(now + index * 0.14 + 0.3);
      }
    },
  };
}

export function DashboardAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const chime = useRef<ReturnType<typeof createChime> | null>(null);
  if (chime.current === null && typeof window !== "undefined") chime.current = createChime();

  const dismiss = useCallback((id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const poll = useCallback(async () => {
    const session = await getValidSession();
    const uid = session?.user.id;
    if (!uid) return;

    const [notices, messages, unread] = await Promise.all([
      rest<Notice[]>(
        "notifications",
        `recipient_id=eq.${uid}&select=id,kind,created_at,actor_id&order=created_at.desc&limit=20`,
      ).catch(() => [] as Notice[]),
      rest<Message[]>(
        "messages",
        "select=id,sender_id,created_at&order=created_at.desc&limit=20",
      ).catch(() => [] as Message[]),
      // unread_message_counts is the real unread source. Counting `messages`
      // rows would label already-read messages as unread.
      rpc<UnreadRow[]>("unread_message_counts").catch(() => [] as UnreadRow[]),
    ]);

    setUnread((unread ?? []).reduce((sum, row) => sum + Number(row.unread_count), 0));

    // First pass only records what already existed: loading the dashboard must
    // not replay a chime for every message that came before.
    if (!primed.current) {
      for (const item of notices) seen.current.add(item.id);
      primed.current = true;
      return;
    }

    const fresh: Alert[] = [];
    for (const notice of notices) {
      if (seen.current.has(notice.id)) continue;
      seen.current.add(notice.id);
      fresh.push({
        id: notice.id,
        text: KIND_LABEL[notice.kind] ?? "Nova interação",
        icon: "notification",
      });
    }
    const newestMessage = messages[0];
    if (newestMessage && !seen.current.has(`msg:${newestMessage.id}`)) {
      seen.current.add(`msg:${newestMessage.id}`);
      if (newestMessage.sender_id !== uid) {
        fresh.push({ id: `msg:${newestMessage.id}`, text: "Nova mensagem", icon: "message" });
      }
    }
    if (!fresh.length) return;

    setAlerts((current) => [...fresh.slice(-3), ...current].slice(0, 4));
    chime.current?.play();
    for (const alert of fresh) {
      window.setTimeout(() => dismiss(alert.id), 6000);
    }
  }, [dismiss]);

  useEffect(() => {
    if (!getSession()) return;
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);

    // Browsers only allow sound after a gesture; arm the context on the first
    // one and replay anything that arrived while it was still locked.
    const unlock = () => {
      chime.current?.unlock();
      if (chime.current) {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [poll]);

  return (
    <>
      <button
        type="button"
        className="dashboard-alert-bell"
        onClick={() => void poll()}
        aria-label={unread ? `${unread} mensagens não lidas` : "Sem mensagens novas"}
      >
        <Bell size={18} />
        {unread > 0 && <em>{unread > 9 ? "9+" : unread}</em>}
      </button>

      <div className="dashboard-alerts" role="status" aria-live="polite">
        {alerts.map((alert) => (
          <div key={alert.id} className="dashboard-alert">
            <span className="dashboard-alert-icon">{iconFor(alert.text)}</span>
            <b>{alert.text}</b>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              aria-label="Dispensar aviso"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}