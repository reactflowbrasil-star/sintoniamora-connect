import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { getRealtimeClient, getSession, invokeFunction, rest } from "@/lib/supabase";
import type TRTCSDK from "trtc-sdk-v5";
import { endLiveSession, endLiveSessionOnUnload, loadLiveDirectory } from "@/lib/live/directory";
import {
  fetchLiveMetrics,
  markViewerPresent,
  blockLiveViewer,
  muteLiveViewer,
  removeLiveViewer,
  LiveBackendMissingError,
} from "@/lib/live/queries";
import {
  REACTION_EMOJI,
  type LiveChatMessage,
  type LiveConnectionKind,
  type LiveFloatingReaction,
  type LiveGift,
  type LiveMetrics,
  type LiveReactionKind,
  type LiveSession,
  type LiveViewer,
  type ModerationIntent,
} from "@/lib/live/types";

type TRTCClient = ReturnType<typeof TRTCSDK.create>;

type Credential = {
  sdkAppId: number;
  userId: string;
  userSig: string;
  roomId: number;
  role: "anchor" | "audience";
};

/** Chat window kept in memory and in the DOM. */
const CHAT_WINDOW = 200;
/** Hard cap on floating reaction nodes so a busy live stays smooth. */
const MAX_FLOATING_REACTIONS = 14;
/** Client throttle layered on top of the 250ms guard the DB trigger already enforces. */
const TAP_COOLDOWN_MS = 320;
/** How long a floating reaction stays on screen before the node is removed. */
const FLOATING_TTL_MS = 2600;

/**
 * Turns a failed join into something actionable. A blocked CORS response is a
 * plain network failure in the browser ("Failed to fetch"), and the usual cause
 * here is the Edge Function's origin allowlist not covering the current domain.
 */
function describeJoinFailure(cause: unknown): string {
  if (cause instanceof LiveBackendMissingError) return cause.message;
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return (
      "O navegador bloqueou a chamada ao servidor de live. Verifique se a origem deste " +
      "domínio está em SINTONIAMORA_ALLOWED_ORIGINS na função tencentrctoken."
    );
  }
  return cause instanceof Error ? cause.message : "Não foi possível entrar na live.";
}

const EMPTY_METRICS: LiveMetrics = {
  current_viewers: 0,
  unique_viewers: 0,
  likes: 0,
  messages: 0,
  gifts: 0,
  points: 0,
};

export type LiveSummary = {
  views: number;
  peak: number;
  likes: number;
  messages: number;
  gifts: number;
  points: number;
  startedAt: number;
  endedAt: number;
};

type LiveContextValue = {
  uid: string | undefined;
  isHost: boolean;
  lives: LiveSession[];
  active: LiveSession | null;
  joined: boolean;
  audioMuted: boolean;
  busy: boolean;
  error: string;
  notice: string;
  connection: LiveConnectionKind;
  metrics: LiveMetrics;
  chat: LiveChatMessage[];
  viewers: LiveViewer[];
  gifts: LiveGift[];
  draft: string;
  title: string;
  panel: null | "viewers" | "moderation" | "gifts" | "more";
  moderation: ModerationIntent | null;
  floating: LiveFloatingReaction[];
  reduceMotion: boolean;
  pendingEnd: boolean;
  summary: LiveSummary | null;
  unreadMessages: number;
  chatRef: RefObject<HTMLDivElement | null>;
  setDraft: (value: string) => void;
  setTitle: (value: string) => void;
  setPanel: (panel: LiveContextValue["panel"]) => void;
  setModeration: (intent: ModerationIntent | null) => void;
  setPendingEnd: (value: boolean) => void;
  dismissFloating: (key: number) => void;
  handleChatScroll: () => void;
  jumpToLatest: () => void;
  sendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  sendReaction: (kind: LiveReactionKind) => void;
  sendGift: (gift: LiveGift) => Promise<void>;
  startLive: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  joinLive: (live: LiveSession) => Promise<void>;
  leaveLive: () => Promise<void>;
  endLive: () => Promise<void>;
  runModeration: () => Promise<void>;
  shareLive: () => Promise<"shared" | "copied" | "failed">;
  toggleAudioMute: () => Promise<void>;
};

const LiveContext = createContext<LiveContextValue | null>(null);

export function useLive() {
  const value = useContext(LiveContext);
  if (!value) throw new Error("useLive precisa estar dentro de <LiveProvider>.");
  return value;
}

/**
 * Single owner of the live room state. Every live component reads from here so
 * chat, counters, presence and moderation stay consistent — the previous
 * Tencent RTC pipeline is reused untouched.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const uid = getSession()?.user.id;
  const clientRef = useRef<TRTCClient | null>(null);
  const remoteHostRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const audioMutedRef = useRef(false);
  const autoJoinedRef = useRef(false);
  const lastTapRef = useRef(0);
  const reactionKeyRef = useRef(0);
  const reactionTimersRef = useRef<Set<number>>(new Set());
  const stickToBottomRef = useRef(true);
  /** Session id of the room in this tab, readable from callbacks and unload handlers. */
  const activeIdRef = useRef<string | null>(null);
  const activeHostRef = useRef<string | null>(null);
  const seenCountRef = useRef(0);
  const namesRef = useRef<Record<string, string>>({});
  const giftsRef = useRef<LiveGift[]>([]);
  const startedAtRef = useRef(0);
  const peakRef = useRef(0);
  const baselineRef = useRef<{ likes: number; messages: number } | null>(null);

  const [lives, setLives] = useState<LiveSession[]>([]);
  const [active, setActive] = useState<LiveSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState<LiveConnectionKind>("idle");
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY_METRICS);
  const [chat, setChat] = useState<LiveChatMessage[]>([]);
  const [viewers, setViewers] = useState<LiveViewer[]>([]);
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [panel, setPanel] = useState<LiveContextValue["panel"]>(null);
  const [moderation, setModeration] = useState<ModerationIntent | null>(null);
  const [floating, setFloating] = useState<LiveFloatingReaction[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pendingEnd, setPendingEnd] = useState(false);
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isHost = Boolean(active && uid && active.host_id === uid);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const loadLives = useCallback(async () => {
    try {
      // Goes through loadLiveDirectory so sessions whose host is gone stop
      // being advertised, and the caller's own leftovers are closed.
      const rows = await loadLiveDirectory({
        uid,
        currentSessionId: activeIdRef.current,
      });
      setLives(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as transmissões.");
    }
  }, [uid]);

  const resolveNames = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => id && !namesRef.current[id]);
    if (!missing.length) return;
    try {
      const people = await rest<{ id: string; display_name: string }[]>(
        "profiles",
        `id=in.(${missing.join(",")})&select=id,display_name`,
      );
      if (!people?.length) return;
      for (const person of people) {
        namesRef.current[person.id] = person.display_name || "Membro";
      }
      setChat((items) => items.map((item) => ({ ...item, displayName: namesRef.current[item.senderId] ?? "" })));
      setViewers((items) => items.map((item) => ({ ...item, displayName: namesRef.current[item.userId] ?? "" })));
    } catch {
      /* display names stay blank; the room still works */
    }
  }, []);

  /* Directory of live sessions, refreshed by Realtime. */
  useEffect(() => {
    void loadLives();
    const channel = getRealtimeClient()
      .channel("live-directory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => void loadLives(),
      )
      .subscribe();
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [loadLives]);

  const pushFloating = useCallback((emoji: string) => {
    const key = ++reactionKeyRef.current;
    const item: LiveFloatingReaction = {
      key,
      emoji,
      leftPct: 8 + Math.round(Math.random() * 80),
      scale: 0.85 + Math.random() * 0.45,
      driftPx: -26 + Math.random() * 52,
    };
    setFloating((items) => {
      const next = [...items, item];
      return next.length > MAX_FLOATING_REACTIONS ? next.slice(-MAX_FLOATING_REACTIONS) : next;
    });
    // Timers are tracked so they can be cleared if the room unmounts mid-flight.
    const timer = window.setTimeout(() => {
      reactionTimersRef.current.delete(timer);
      setFloating((items) => items.filter((entry) => entry.key !== key));
    }, FLOATING_TTL_MS);
    reactionTimersRef.current.add(timer);
  }, []);

  useEffect(() => {
    const timers = reactionTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // The server counts people; the peak is whatever the host actually observed
  // while streaming, kept separately because no viewer history is stored.
  const refreshMetrics = useCallback(async (sessionId: string) => {
    try {
      const next = await fetchLiveMetrics(sessionId);
      peakRef.current = Math.max(peakRef.current, next.current_viewers);
      setMetrics(next);
    } catch (cause) {
      // A missing presence/metrics layer is a deployment problem, and it used to
      // pass through as an unhandled rejection leaving the live silently broken.
      if (cause instanceof LiveBackendMissingError) setError(cause.message);
    }
  }, []);

  /* Presence heartbeat + aggregated counters while inside a live. */
  useEffect(() => {
    if (!active || !joined) return;
    void markViewerPresent(active.id);
    void refreshMetrics(active.id);
    const heartbeat = window.setInterval(() => {
      void markViewerPresent(active.id)
        .then((ok) => {
          if (!ok && connection === "connected") setConnection("reconnecting");
        })
        .catch((cause: unknown) => {
          if (cause instanceof LiveBackendMissingError) setError(cause.message);
        });
      void refreshMetrics(active.id);
    }, 15_000);
    return () => window.clearInterval(heartbeat);
    // `connection` is read, not tracked; including it would restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, joined, refreshMetrics]);

  /* Chat + interactions for the active live. */
  useEffect(() => {
    if (!active || !uid) return;
    let cancelled = false;

    void (async () => {
      try {
        const rows = await rest<{ id: string; sender_id: string; body: string; created_at: string }[]>(
          "live_chat_messages",
          `session_id=eq.${active.id}&select=id,sender_id,body,created_at&order=created_at.asc&limit=${CHAT_WINDOW}`,
        );
        if (cancelled || !rows?.length) {
          if (!cancelled) {
            setChat([]);
            seenCountRef.current = 0;
          }
          return;
        }
        const history: LiveChatMessage[] = rows.map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          displayName: namesRef.current[row.sender_id] ?? "",
          body: row.body,
          createdAt: new Date(row.created_at),
          isOwn: row.sender_id === uid,
        }));
        setChat(history);
        seenCountRef.current = history.length;
        void resolveNames(rows.map((row) => row.sender_id));
      } catch {
        /* keep whatever is already rendered */
      }
    })();

    const channel = getRealtimeClient()
      .channel(`live-room:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${active.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; body: string; created_at: string };
          setChat((items) => {
            if (items.some((item) => item.id === row.id)) return items;
            const next = [...items, {
              id: row.id,
              senderId: row.sender_id,
              displayName: namesRef.current[row.sender_id] ?? "",
              body: row.body,
              createdAt: new Date(row.created_at),
              isOwn: row.sender_id === uid,
            }];
            return next.length > CHAT_WINDOW ? next.slice(-CHAT_WINDOW) : next;
          });
          if (!stickToBottomRef.current) {
            setUnreadMessages((count) => count + 1);
          }
          void resolveNames([row.sender_id]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_interactions",
          filter: `session_id=eq.${active.id}`,
        },
        (payload) => {
          const row = payload.new as { kind: string; gift_id: string | null };
          void refreshMetrics(active.id);
          if (row.kind === "GIFT" && row.gift_id) {
            const gift = giftsRef.current.find((item) => item.id === row.gift_id);
            if (gift) pushFloating(gift.emoji);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${active.id}` },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row.status === "ENDED") setConnection("ended");
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection((current) => (current === "connecting" ? "connected" : current));
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("reconnecting");
      });

    return () => {
      cancelled = true;
      void getRealtimeClient().removeChannel(channel);
    };
  }, [active, uid, refreshMetrics, resolveNames, pushFloating]);

  /* Gift catalogue + viewer roster (host-only read; degrades quietly). */
  const loadViewers = useCallback(async () => {
    if (!active) return;
    try {
      const rows = await rest<{ user_id: string }[]>(
        "live_viewer_presence",
        `session_id=eq.${active.id}&select=user_id&order=seen_at.desc&limit=100`,
      );
      const people = rows ?? [];
      await resolveNames(people.map((row) => row.user_id));
      setViewers(
        people.map((row) => ({
          userId: row.user_id,
          displayName: namesRef.current[row.user_id] ?? "",
          role: row.user_id === active.host_id ? "host" : "viewer",
        })),
      );
    } catch (cause) {
      setViewers([]);
      const code = cause instanceof Error ? (cause as Error & { code?: string }).code : undefined;
      const message = cause instanceof Error ? cause.message : "";
      if (code === "PGRST205" || /PGRST205|could not find the table/i.test(message)) {
        setError(
          "A lista de espectadores não está disponível: a tabela live_viewer_presence ainda não foi criada. Aplique supabase/migrations/20261003000000_live_experience.sql.",
        );
      }
    }
  }, [active, resolveNames]);

  useEffect(() => {
    if (!active || !joined) return;
    void (async () => {
      try {
        const rows = await rest<LiveGift[]>("live_gifts", "active=eq.true&select=id,name,emoji,points&order=points.asc");
        giftsRef.current = rows ?? [];
        setGifts(rows ?? []);
      } catch {
        setGifts([]);
      }
    })();
    void loadViewers();
    const roster = window.setInterval(() => void loadViewers(), 20_000);
    return () => window.clearInterval(roster);
  }, [active, joined, loadViewers]);

  /* Smart auto-scroll: only follow the tail while the reader is at the end. */
  useEffect(() => {
    const node = chatRef.current;
    if (!node || !joined) return;
    if (stickToBottomRef.current) {
      node.scrollTop = node.scrollHeight;
      setUnreadMessages(0);
    }
  }, [chat, joined]);

  const handleChatScroll = useCallback(() => {
    const node = chatRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distance < 120;
    if (stickToBottomRef.current) setUnreadMessages(0);
  }, []);

  const jumpToLatest = useCallback(() => {
    const node = chatRef.current;
    if (!node) return;
    stickToBottomRef.current = true;
    setUnreadMessages(0);
    node.scrollTo({ top: node.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion]);

  const dismissFloating = useCallback((key: number) => {
    setFloating((items) => items.filter((item) => item.key !== key));
  }, []);

  /* Tencent RTC media pipeline — unchanged behaviour from the previous build. */
  const joinLive = useCallback(async (live: LiveSession) => {
    if (!uid) {
      setError("Entre na sua conta para assistir.");
      return;
    }
    if (busyRef.current) {
      setError("Já existe uma conexão em andamento. Aguarde um instante e tente novamente.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setConnection("connecting");
    try {
      const credentials = await invokeFunction<Credential>("tencentrctoken", { sessionId: live.id });
      const { default: TRTC } = await import("trtc-sdk-v5");
      const support = await TRTC.isSupported();
      if (!support.result) {
        throw new Error(
          "Este navegador não oferece suporte ao WebRTC necessário. Tente Chrome, Edge ou Safari atualizado em uma conexão HTTPS.",
        );
      }
      const instance = TRTC.create();
      clientRef.current = instance;

      instance.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
        const view = `${userId}_${streamType}`;
        if (!document.getElementById(view) && remoteHostRef.current) {
          const holder = document.createElement("div");
          holder.id = view;
          holder.className = "live-remote-video";
          remoteHostRef.current.appendChild(holder);
        }
        window.setTimeout(() => {
          if (!document.getElementById(view)) return;
          void instance.startRemoteVideo({ userId, streamType, view }).catch(() => undefined);
        }, 0);
      });

      instance.on(TRTC.EVENT.REMOTE_AUDIO_AVAILABLE, ({ userId }) => {
        if (credentials.role === "audience") void instance.muteRemoteAudio(userId, audioMutedRef.current).catch(() => undefined);
      });

      instance.on(TRTC.EVENT.REMOTE_USER_EXIT, () => {
        if (live.host_id !== uid) setConnection("ended");
      });

      await instance.enterRoom({
        sdkAppId: credentials.sdkAppId,
        userId: credentials.userId,
        userSig: credentials.userSig,
        roomId: credentials.roomId,
        scene: TRTC.TYPE.SCENE_LIVE,
        role: credentials.role === "anchor" ? TRTC.TYPE.ROLE_ANCHOR : TRTC.TYPE.ROLE_AUDIENCE,
      });

      if (credentials.role === "anchor") {
        await instance.startLocalVideo({ view: "live-local-video", option: { fillMode: "cover", mirror: true } });
        await instance.startLocalAudio().catch(() => undefined);
        if (audioMuted) await instance.updateLocalAudio({ mute: true }).catch(() => undefined);
      } else if (audioMuted) {
        await instance.muteRemoteAudio("*", true).catch(() => undefined);
      }

      startedAtRef.current = Date.now();
      peakRef.current = 0;
      baselineRef.current = null;
      stickToBottomRef.current = true;
      // Refs are updated before the state setters so callers that continue
      // right after this await already see the room.
      activeIdRef.current = live.id;
      activeHostRef.current = live.host_id;
      setActive(live);
      setJoined(true);
      setConnection("connected");
      setPanel(null);
      await markViewerPresent(live.id).catch(() => false);
      await refreshMetrics(live.id);
    } catch (cause) {
      clientRef.current = null;
      activeIdRef.current = null;
      activeHostRef.current = null;
      setError(describeJoinFailure(cause));
      setConnection("disconnected");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [uid, refreshMetrics, audioMuted]);

  const toggleAudioMute = useCallback(async () => {
    const nextMuted = !audioMuted;
    audioMutedRef.current = nextMuted;
    setAudioMuted(nextMuted);
    if (!clientRef.current) return;
    try {
      if (isHost) await clientRef.current.updateLocalAudio({ mute: nextMuted });
      else await clientRef.current.muteRemoteAudio("*", nextMuted);
    } catch (cause) {
      audioMutedRef.current = !nextMuted;
      setAudioMuted(!nextMuted);
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o áudio da live.");
    }
  }, [audioMuted, isHost]);

  const startLive = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) {
      setError("Já existe uma conexão em andamento. Aguarde um instante e tente novamente.");
      return;
    }
    if (!uid) {
      setError("Entre na sua conta para iniciar uma transmissão.");
      return;
    }
    const liveTitle = title.trim();
    if (liveTitle.length < 3) {
      setError("Digite um título com pelo menos 3 caracteres para iniciar sua live.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    let createdId: string | null = null;
    try {
      // One broadcast per host. Whatever is still marked LIVE under this
      // account is a leftover from a previous attempt, and leaving it there is
      // what piled up several "Transmitindo agora" cards in the dashboard.
      const previous = await rest<LiveSession[]>(
        "live_sessions",
        `host_id=eq.${uid}&status=eq.LIVE&select=id`,
      ).catch(() => [] as LiveSession[]);
      await Promise.all((previous ?? []).map((row) => endLiveSession(row.id, uid).catch(() => undefined)));

      const created = await rest<LiveSession[]>(
        "live_sessions",
        "select=id,host_id,room_id,title,status,created_at",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ host_id: uid, title: liveTitle, status: "LIVE" }),
        },
      );
      const live = created?.[0];
      if (!live) throw new Error("O servidor não confirmou a criação da live.");
      createdId = live.id;
      // Claim it right away: loadLives() runs below and reclaims own sessions
      // that are not advertised yet, which would otherwise close this one
      // before the room even opened.
      activeIdRef.current = live.id;
      activeHostRef.current = uid;
      setTitle("");
      await loadLives();
      // The session row now exists, so this step is finished. Releasing busyRef
      // before joinLive is essential: joinLive refuses to run while it is set
      // and would bail with "Já existe uma conexão em andamento" — which is why
      // starting a live never actually joined the room.
      busyRef.current = false;
      setBusy(false);
      await joinLive(live);
      // If the room never opened, this row would stay LIVE with nobody behind
      // it, so it is closed here instead of being left as a ghost.
      if (activeIdRef.current !== live.id) {
        await endLiveSession(live.id, uid).catch(() => undefined);
        activeIdRef.current = null;
        activeHostRef.current = null;
        createdId = null;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a transmissão.");
      if (createdId) {
        await endLiveSession(createdId, uid).catch(() => undefined);
        activeIdRef.current = null;
        activeHostRef.current = null;
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [title, uid, joinLive, loadLives]);

  const leaveLive = useCallback(async () => {
    const live = active;
    if (clientRef.current) {
      const instance = clientRef.current;
      await instance.stopLocalVideo().catch(() => undefined);
      await instance.stopLocalAudio().catch(() => undefined);
      await instance.exitRoom().catch(() => undefined);
      clientRef.current = null;
    }
    if (live && uid) {
      // Presence is dropped for the host too: leaving while marked present was
      // what kept a stale "Transmitindo agora" card on screen.
      await rest("live_viewer_presence", `session_id=eq.${live.id}&user_id=eq.${uid}`, {
        method: "DELETE",
      }).catch(() => undefined);
      // Leaving as the host means the broadcast is over. Previously this only
      // removed the viewer's presence row, so the session stayed LIVE forever
      // and kept being advertised as an ongoing transmission.
      if (live.host_id === uid) {
        await endLiveSession(live.id, uid).catch(() => undefined);
      }
    }
    remoteHostRef.current?.replaceChildren();
    setJoined(false);
    audioMutedRef.current = false;
    setAudioMuted(false);
    setActive(null);
    setConnection("idle");
    setChat([]);
    setViewers([]);
    setFloating([]);
    setPanel(null);
    setModeration(null);
    setPendingEnd(false);
    setUnreadMessages(0);
    setMetrics(EMPTY_METRICS);
    stickToBottomRef.current = true;
    seenCountRef.current = 0;
    activeIdRef.current = null;
    activeHostRef.current = null;
    await loadLives();
  }, [active, uid, loadLives]);

  const endLive = useCallback(async () => {
    const live = active;
    if (!live || !uid || live.host_id !== uid) {
      setPendingEnd(false);
      return;
    }
    // Read the recap before the session flips to ENDED and stops being readable.
    const final = await fetchLiveMetrics(live.id);
    const startedAt = startedAtRef.current || Date.now();
    try {
      await endLiveSession(live.id, uid);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao encerrar a transmissão.");
      setPendingEnd(false);
      return;
    }
    setSummary({
      views: final.unique_viewers,
      peak: peakRef.current,
      likes: Math.max(0, final.likes - (baselineRef.current?.likes ?? 0)),
      messages: Math.max(0, final.messages - (baselineRef.current?.messages ?? 0)),
      gifts: final.gifts,
      points: final.points,
      startedAt,
      endedAt: Date.now(),
    });
    setPendingEnd(false);
    await leaveLive();
  }, [active, uid, leaveLive]);

  /* Leaving the room must close the broadcast.
   *
   * Two exits were previously unhandled and both left the session marked LIVE
   * with nobody behind it: closing the tab, and navigating away inside the SPA
   * (the header link back to /dashboard). Both fire here, and the request is
   * sent with `keepalive` so it survives the document going away. */
  useEffect(() => {
    const closeOnExit = (event?: PageTransitionEvent) => {
      // Back/forward cache keeps the page alive: the host is still streaming,
      // so ending the session here would cut a broadcast that never stopped.
      if (event?.persisted) return;
      const sessionId = activeIdRef.current;
      const hostId = activeHostRef.current;
      const user = getSession()?.user.id;
      if (!sessionId || !hostId || !user || hostId !== user) return;
      void endLiveSessionOnUnload(sessionId, user).catch(() => undefined);
    };
    window.addEventListener("pagehide", closeOnExit);
    return () => {
      window.removeEventListener("pagehide", closeOnExit);
      closeOnExit();
    };
  }, []);

  /* Deep link /live?session=<id> joins as soon as the directory arrives. */
  useEffect(() => {
    if (autoJoinedRef.current || busyRef.current || active || !lives.length) return;
    const requested = new URLSearchParams(window.location.search).get("session");
    if (!requested) return;
    const live = lives.find((item) => item.id === requested);
    if (!live) return;
    autoJoinedRef.current = true;
    void joinLive(live);
  }, [lives, active, joinLive]);

  const sendMessage = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uid || !active) return;
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    stickToBottomRef.current = true;
    try {
      await rest("live_chat_messages", "", {
        method: "POST",
        body: JSON.stringify({ session_id: active.id, sender_id: uid, body }),
      });
    } catch (cause) {
      setDraft(body);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar sua mensagem.");
    }
  }, [uid, active, draft]);

  const sendReaction = useCallback((kind: LiveReactionKind) => {
    pushFloating(REACTION_EMOJI[kind]);
    if (!uid || !active || isHost) return;
    const now = Date.now();
    if (now - lastTapRef.current < TAP_COOLDOWN_MS) return;
    lastTapRef.current = now;
    // Fire-and-forget: the animation is optimistic, the server owns the count.
    void rest("live_interactions", "", {
      method: "POST",
      body: JSON.stringify({ session_id: active.id, sender_id: uid, kind: "TAP", quantity: 1 }),
    }).catch(() => undefined);
  }, [uid, active, isHost, pushFloating]);

  const sendGift = useCallback(async (gift: LiveGift) => {
    if (!uid || !active || isHost || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await rest("live_interactions", "", {
        method: "POST",
        body: JSON.stringify({ session_id: active.id, sender_id: uid, kind: "GIFT", gift_id: gift.id, quantity: 1 }),
      });
      setPanel(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o presente.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [uid, active, isHost]);

  const runModeration = useCallback(async () => {
    if (!active || !moderation) return;
    try {
      if (moderation.action === "mute_chat") {
        await muteLiveViewer(active.id, moderation.targetId, "Silenciado durante a transmissão");
        setNotice("Usuário silenciado no chat.");
      } else if (moderation.action === "remove_from_live") {
        await removeLiveViewer(active.id, moderation.targetId, "Removido durante a transmissão");
        setNotice("Usuário removido da live.");
      } else {
        await blockLiveViewer(active.id, moderation.targetId, "Bloqueado durante a transmissão");
        setNotice("Usuário bloqueado.");
      }
      setModeration(null);
      setPanel(null);
      await loadViewers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível aplicar a ação de moderação.");
    }
  }, [active, moderation, loadViewers]);

  const shareLive = useCallback(async () => {
    if (!active) return "failed" as const;
    const url = new URL(window.location.href);
    url.searchParams.set("session", active.id);
    const payload = {
      title: `sexflow — ${active.title}`,
      text: "Assista à live agora",
      url: url.toString(),
    };
    if (navigator.share && navigator.canShare?.(payload)) {
      try {
        await navigator.share(payload);
        return "shared" as const;
      } catch {
        return "failed" as const;
      }
    }
    try {
      await navigator.clipboard.writeText(payload.url);
      return "copied" as const;
    } catch {
      return "failed" as const;
    }
  }, [active]);

  const value = useMemo<LiveContextValue>(
    () => ({
      uid,
      isHost,
      lives,
      active,
      joined,
      audioMuted,
      busy,
      error,
      notice,
      connection,
      metrics,
      chat,
      viewers,
      gifts,
      draft,
      title,
      panel,
      moderation,
      floating,
      reduceMotion,
      pendingEnd,
      summary,
      unreadMessages,
      chatRef,
      setDraft,
      setTitle,
      setPanel,
      setModeration,
      setPendingEnd,
      dismissFloating,
      handleChatScroll,
      jumpToLatest,
      sendMessage,
      sendReaction,
      sendGift,
      startLive,
      joinLive,
      leaveLive,
      endLive,
      runModeration,
      shareLive,
      toggleAudioMute,
    }),
    [
      uid, isHost, lives, active, joined, audioMuted, busy, error, notice, connection, metrics,
      chat, viewers, gifts, draft, title, panel, moderation, floating, reduceMotion,
      pendingEnd, summary, unreadMessages, dismissFloating, handleChatScroll,
      jumpToLatest, sendMessage, sendReaction, sendGift, startLive, joinLive,
      leaveLive, endLive, runModeration, shareLive, toggleAudioMute,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
