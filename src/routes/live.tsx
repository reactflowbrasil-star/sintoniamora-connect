import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type TRTCSDK from "trtc-sdk-v5";
import {
  ArrowLeft,
  Coins,
  Eye,
  Gift,
  Heart,
  LoaderCircle,
  MessageCircle,
  Radio,
  Send,
  Square,
} from "lucide-react";
import { getRealtimeClient, getSession, getValidSession, invokeFunction, rest } from "@/lib/supabase";

export const Route = createFileRoute("/live")({ component: Live });
type TRTCClient = ReturnType<typeof TRTCSDK.create>;
type LiveSession = {
  id: string;
  host_id: string;
  room_id: number;
  title: string;
  status: "LIVE" | "ENDED";
  created_at: string;
};
type ChatMessage = {
  id: string;
  session_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type LiveGift = { id: string; name: string; emoji: string; points: number };
type LiveInteraction = { id: string; session_id: string; sender_id: string; kind: "TAP" | "GIFT"; gift_id: string | null; quantity: number; created_at: string };
type Credential = {
  sdkAppId: number;
  userId: string;
  userSig: string;
  roomId: number;
  role: "anchor" | "audience";
};
type RemoteVideo = { userId: string; streamType: string };

function Live() {
  const session = getSession();
  const uid = session?.user.id;
  const nav = useNavigate();
  const client = useRef<TRTCClient | null>(null);
  const liveOperation = useRef(false);
  const autoJoinAttempted = useRef(false);
  const lastTapAt = useRef(0);
  const giftsRef = useRef<LiveGift[]>([]);
  const remoteVideos = useRef<HTMLDivElement | null>(null);
  const [lives, setLives] = useState<LiveSession[]>([]);
  const [active, setActive] = useState<LiveSession | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [interactions, setInteractions] = useState<LiveInteraction[]>([]);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLives = useCallback(async () => {
    if (!uid) return;
    try {
      const rows = await rest<LiveSession[]>(
        "live_sessions",
        "status=eq.LIVE&select=id,host_id,room_id,title,status,created_at&order=created_at.desc&limit=50",
      );
      setLives(rows ?? []);
      const ids = [...new Set((rows ?? []).map((row) => row.host_id))];
      if (ids.length) {
        const people = await rest<{ id: string; display_name: string }[]>(
          "profiles",
          `id=in.(${ids.join(",")})&select=id,display_name`,
        );
        setProfiles(
          Object.fromEntries((people ?? []).map((person) => [person.id, person.display_name])),
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar as transmissões.",
      );
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      nav({ to: "/entrar" });
      return;
    }
    void loadLives();
    const channel = getRealtimeClient()
      .channel(`live-directory:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => void loadLives(),
      )
      .subscribe();
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [uid, nav, loadLives]);

  const loadChat = useCallback(async (live: LiveSession) => {
    const rows = await rest<ChatMessage[]>(
      "live_chat_messages",
      `session_id=eq.${live.id}&select=id,session_id,sender_id,body,created_at&order=created_at.asc&limit=100`,
    );
    setChat(rows ?? []);
    const ids = [...new Set((rows ?? []).map((row) => row.sender_id))];
    if (ids.length) {
      const people = await rest<{ id: string; display_name: string }[]>(
        "profiles",
        `id=in.(${ids.join(",")})&select=id,display_name`,
      );
      setProfiles((previous) => ({
        ...previous,
        ...Object.fromEntries((people ?? []).map((person) => [person.id, person.display_name])),
      }));
    }
  }, []);

  useEffect(() => {
    if (!active || !uid) return;
    void loadChat(active);
    void (async () => {
      const [activity, giftRows, balances] = await Promise.all([
        rest<LiveInteraction[]>("live_interactions", `session_id=eq.${active.id}&select=id,session_id,sender_id,kind,gift_id,quantity,created_at&order=created_at.desc&limit=100`).catch(() => []),
        rest<LiveGift[]>("live_gifts", "active=eq.true&select=id,name,emoji,points&order=points.asc").catch(() => []),
        active.host_id === uid ? rest<Array<{total_points:number}>>("live_reward_balances", `user_id=eq.${uid}&select=total_points`).catch(() => []) : Promise.resolve([]),
      ]);
      setInteractions([...(activity ?? [])].reverse());
      giftsRef.current = giftRows ?? [];
      setGifts(giftsRef.current);
      setRewardPoints(Number(balances?.[0]?.total_points ?? 0));
    })();
    const channel = getRealtimeClient()
      .channel(`live-chat:${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${active.id}`,
        },
        (payload) => {
          const message = payload.new as ChatMessage;
          setChat((items) =>
            items.some((item) => item.id === message.id) ? items : [...items, message],
          );
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_interactions", filter: `session_id=eq.${active.id}` }, (payload) => {
        const interaction = payload.new as LiveInteraction;
        setInteractions((items) => items.some((item) => item.id === interaction.id) ? items : [...items.slice(-99), interaction]);
        if (interaction.kind === "GIFT" && active.host_id === uid) {
          const gift = giftsRef.current.find((item) => item.id === interaction.gift_id);
          if (gift) setRewardPoints((points) => points + gift.points * interaction.quantity);
        }
      })
      .subscribe();
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [active, uid, loadChat]);

  async function connect(live: LiveSession, startingOwnLive = false) {
    const currentUserId = uid ?? (startingOwnLive ? live.host_id : undefined);
    if (!currentUserId) {
      setError("Entre na sua conta para participar de uma transmissão.");
      return;
    }
    if (liveOperation.current && !startingOwnLive) {
      setError("Já existe uma conexão em andamento. Aguarde um instante e tente novamente.");
      return;
    }
    if (!startingOwnLive) liveOperation.current = true;
    setBusy(true);
    setError("");
    try {
      const credentials = await invokeFunction<Credential>("tencentrctoken", {
        sessionId: live.id,
      });
      const { default: TRTC } = await import("trtc-sdk-v5");
      const support = await TRTC.isSupported();
      if (!support.result)
        throw new Error(
          "Este navegador não oferece suporte ao WebRTC necessário. Tente Chrome, Edge ou Safari atualizado em uma conexão HTTPS.",
        );
      const instance = TRTC.create();
      client.current = instance;
      instance.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
        const view = `${userId}_${streamType}`;
        if (!document.getElementById(view) && remoteVideos.current) {
          const video = document.createElement("div");
          video.id = view;
          video.className = "live-remote-video";
          remoteVideos.current.appendChild(video);
        }
        window.setTimeout(() => {
          void instance
            .startRemoteVideo({ userId, streamType, view })
            .catch((cause) =>
              setError(cause instanceof Error ? cause.message : "Falha ao exibir o vídeo da live."),
            );
        }, 0);
      });
      instance.on(TRTC.EVENT.REMOTE_USER_EXIT, () => {
        if (live.host_id !== currentUserId) setError("A transmissão foi encerrada.");
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
        await instance.startLocalVideo({
          view: "live-local-video",
          option: { fillMode: "cover", mirror: true },
        });
        await instance.startLocalAudio();
      }
      setActive(live);
      setJoined(true);
    } catch (cause) {
      client.current = null;
      if (live.host_id === currentUserId) {
        await rest("live_sessions", `id=eq.${live.id}&host_id=eq.${currentUserId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ENDED", ended_at: new Date().toISOString() }),
        }).catch(() => undefined);
        await loadLives();
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar na live.");
    } finally {
      setBusy(false);
      if (!startingOwnLive) liveOperation.current = false;
    }
  }

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("session");
    if (!requestedId || autoJoinAttempted.current || busy || active || !lives.length) return;
    const requestedLive = lives.find((live) => live.id === requestedId);
    if (!requestedLive) return;
    autoJoinAttempted.current = true;
    void connect(requestedLive);
  }, [lives, active, busy]);

  async function startLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (liveOperation.current) {
      setError("Já existe uma conexão em andamento. Aguarde um instante e tente novamente.");
      return;
    }
    const liveTitle = title.trim();
    if (liveTitle.length < 3) {
      setError("Digite um título com pelo menos 3 caracteres para iniciar sua live.");
      return;
    }
    liveOperation.current = true;
    setBusy(true);
    setError("");
    try {
      const currentSession = await getValidSession();
      if (!currentSession?.user.id)
        throw new Error("Sua sessão expirou. Entre novamente para iniciar uma transmissão.");
      const rows = await rest<LiveSession[]>(
        "live_sessions",
        "select=id,host_id,room_id,title,status,created_at",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ host_id: currentSession.user.id, title: liveTitle, status: "LIVE" }),
        },
      );
      const created = rows?.[0];
      if (!created) throw new Error("O servidor não confirmou a criação da live.");
      setTitle("");
      await loadLives();
      setBusy(false);
      await connect(created, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a transmissão.");
    } finally {
      liveOperation.current = false;
      setBusy(false);
    }
  }

  async function leaveLive(endForEveryone = false) {
    const live = active;
    if (client.current) {
      try {
        await client.current.stopLocalVideo();
      } catch {
        /* audience has no local camera */
      }
      try {
        await client.current.stopLocalAudio();
      } catch {
        /* audience has no local microphone */
      }
      try {
        await client.current.exitRoom();
      } catch {
        /* connection may already be closed */
      }
      client.current = null;
    }
    if (live && endForEveryone && live.host_id === uid) {
      try {
        await rest("live_sessions", `id=eq.${live.id}&host_id=eq.${uid}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ENDED", ended_at: new Date().toISOString() }),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha ao encerrar a transmissão.");
      }
    }
    setJoined(false);
    setActive(null);
    await loadLives();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid || !active || !draft.trim()) return;
    try {
      await rest("live_chat_messages", "", {
        method: "POST",
        body: JSON.stringify({ session_id: active.id, sender_id: uid, body: draft.trim() }),
      });
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar sua mensagem.");
    }
  }

  async function sendTap() {
    if (!uid || !active || isHost) return;
    const now = Date.now();
    if (now - lastTapAt.current < 250) return;
    lastTapAt.current = now;
    try {
      await rest("live_interactions", "", { method: "POST", body: JSON.stringify({ session_id: active.id, sender_id: uid, kind: "TAP", quantity: 1 }) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar sua reação.");
    }
  }

  async function sendGift(gift: LiveGift) {
    if (!uid || !active || isHost || busy) return;
    setBusy(true);
    setError("");
    try {
      await rest("live_interactions", "", { method: "POST", body: JSON.stringify({ session_id: active.id, sender_id: uid, kind: "GIFT", gift_id: gift.id, quantity: 1 }) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o presente.");
    } finally { setBusy(false); }
  }

  const isHost = active?.host_id === uid;
  const tapCount = interactions.filter((item) => item.kind === "TAP").length;
  const giftCount = interactions.filter((item) => item.kind === "GIFT").reduce((sum, item) => sum + item.quantity, 0);
  return (
    <main className="live-experience">
      <header className="live-experience-header">
        <a href="/" aria-label="Voltar">
          <ArrowLeft size={19} />
        </a>
        <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
        <span>
          <span className="live-pulse" /> AO VIVO
        </span>
      </header>
      <div className="live-experience-content">
        <section className="live-stage">
          <div className="live-stage-video">
            <div
              id="live-local-video"
              className={joined && isHost ? "live-local-video" : "live-local-video hidden"}
            />
            <div className="live-anchor-video" ref={remoteVideos} />
          </div>
          {joined && active ? (
            <div className="live-stage-overlay">
              <b>{active.title}</b>
              <span>
                <Eye size={15} /> transmissão real via Tencent RTC
              </span>
              <button className="live-exit" onClick={() => void leaveLive(isHost)}>
                <Square size={15} />
                {isHost ? "Encerrar live" : "Sair"}
              </button>
            </div>
          ) : (
            <div className="live-stage-empty">
              <Radio size={35} />
              <h1>Lives da comunidade</h1>
              <p>
                Assista a transmissões reais ou inicie a sua. O navegador solicitará acesso à câmera
                e ao microfone ao transmitir.
              </p>
            </div>
          )}
        </section>
        <aside className="live-sidebar">
          {error && (
            <p className="live-error" role="alert">
              {error}
            </p>
          )}
          {!joined && (
            <form id="live-start" className="live-start-form" onSubmit={(event) => void startLive(event)}>
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
              <button className="button button-primary" aria-busy={busy}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <Radio size={17} />}{" "}
                {busy ? "Preparando transmissão…" : "Iniciar com câmera"}
              </button>
              <small>Para transmitir, use uma conexão HTTPS e permita câmera e microfone.</small>
            </form>
          )}
          <section className="live-directory" id="live-directory">
            <h2>
              Transmissões ativas <span>{lives.length}</span>
            </h2>
            {lives.map((live) => (
              <article className="live-list-item" key={live.id}>
                <div>
                  <b>{live.title}</b>
                  <small>
                    {profiles[live.host_id] || "Membro"}
                    {live.host_id === uid ? " · você" : ""}
                  </small>
                </div>
                {live.host_id !== uid && (
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => void connect(live)}
                  >
                    {busy ? "Conectando…" : "Assistir"}
                  </button>
                )}
              </article>
            ))}
            {!lives.length && <p>Ninguém está ao vivo neste momento.</p>}
          </section>
          {active && joined && (
            <section className="live-chat">
              <h2>
                <MessageCircle size={17} /> Chat da live
              </h2>
              <div className="live-chat-messages">
                {chat.map((message) => (
                  <p key={message.id}>
                    <b>
                      {message.sender_id === uid ? "Você" : profiles[message.sender_id] || "Membro"}
                    </b>
                    {message.body}
                    <time>
                      {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </p>
                ))}
                {!chat.length && (
                  <small>Seja a primeira pessoa a enviar uma mensagem respeitosa.</small>
                )}
              </div>
              <form onSubmit={(event) => void sendMessage(event)}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escreva no chat…"
                  maxLength={400}
                  required
                />
                <button aria-label="Enviar mensagem">
                  <Send size={17} />
                </button>
              </form>
              <div className="live-engagement" aria-label="Reações e presentes da transmissão">
                <div className="live-engagement-totals"><span><Heart size={15}/> {tapCount} reações</span><span><Gift size={15}/> {giftCount} presentes</span>{isHost && <span><Coins size={15}/> {rewardPoints} pontos recebidos</span>}</div>
                {!isHost && <div className="live-engagement-actions"><button className="live-tap-button" onClick={() => void sendTap()} type="button" aria-label="Enviar tap tap">💖 <span>Tap tap</span></button><div className="live-gift-buttons">{gifts.map((gift) => <button type="button" key={gift.id} onClick={() => void sendGift(gift)} disabled={busy} title={`${gift.name} · ${gift.points} pontos virtuais`}>{gift.emoji}<small>{gift.name}</small></button>)}</div></div>}
                <small className="live-rewards-note">Pontos são recompensas virtuais da comunidade e não representam dinheiro.</small>
                <div className="live-interaction-feed" aria-live="polite">{interactions.slice(-5).reverse().filter((item) => item.kind === "GIFT").map((item) => <span key={item.id}>{gifts.find((gift) => gift.id === item.gift_id)?.emoji ?? "🎁"} Presente enviado</span>)}</div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
