import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { getRealtimeClient, getSession, removeUpload, rest, rpc, signedUrl, upload } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { Send, RefreshCw, ImagePlus, Mic, Square, Smile, Sticker, Trash2 } from "lucide-react";
import { newObjectId } from "@/lib/media";
export const Route = createFileRoute("/mensagens")({ component: Messages });
type Member = { conversation_id: string; user_id: string; joined_at: string };
type Profile = { id: string; display_name: string };
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  media?: Array<{ id: string; object_path: string; media_type: "photo" | "audio"; mime_type: string; size_bytes: number; url?: string }>;
  reactions?: Array<{ user_id: string; reaction: string }>;
};
type Thread = { conversation_id: string; other_id: string; name: string };
function Messages() {
  const session = getSession(),
    uid = session?.user.id,
    nav = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]),
    [active, setActive] = useState(() =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("conversation") || ""
        : "",
    ),
    [items, setItems] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false),
    [stickersOpen, setStickersOpen] = useState(false),
    [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null), recorder = useRef<MediaRecorder | null>(null), audioChunks = useRef<Blob[]>([]);
  const mediaUrlCache = useRef(new Map<string, { url: string; expiresAt: number }>());
  const clearBefore = useRef(new Map<string, string>());
  const emojiChoices = ["😀", "😍", "😘", "🥰", "😂", "🔥", "❤️", "👍", "👏", "🤗", "😉", "💋"];
  const stickers = ["💌", "🌹", "💖", "😘", "🥰", "🔥", "💋", "🫶"];
  const reactionOptions = [{ key: "like", emoji: "👍", label: "Curtir" }, { key: "love", emoji: "❤️", label: "Amei" }, { key: "laugh", emoji: "😂", label: "Rir" }, { key: "wow", emoji: "😮", label: "Uau" }, { key: "fire", emoji: "🔥", label: "Incrível" }];
  const loadThreads = useCallback(async () => {
    if (!uid) return;
    try {
      const mine = await rest<Member[]>(
        "conversation_members",
        `user_id=eq.${uid}&select=conversation_id,joined_at&order=joined_at.desc&limit=50`,
      );
      const pairs = await Promise.all(
        (mine ?? []).map(async (row) => {
          const other = await rest<Member[]>(
            "conversation_members",
            `conversation_id=eq.${row.conversation_id}&user_id=neq.${uid}&select=conversation_id,user_id&limit=1`,
          );
          return other?.[0]
            ? { conversation_id: row.conversation_id, other_id: other[0].user_id }
            : null;
        }),
      );
      const list = pairs.filter((x): x is { conversation_id: string; other_id: string } =>
        Boolean(x),
      );
      const ids = [...new Set(list.map((x) => x.other_id))];
      const people = ids.length
        ? await rest<Profile[]>("profiles", `id=in.(${ids.join(",")})&select=id,display_name`)
        : [];
      const names = new Map((people ?? []).map((p) => [p.id, p.display_name]));
      const result = list.map((x) => ({ ...x, name: names.get(x.other_id) || "Membro" }));
      setThreads(result);
      if (!active && result.length) setActive(result[0]!.conversation_id);
      if (
        !result.some((t) => t.conversation_id === active) &&
        result.length &&
        new URLSearchParams(window.location.search).has("conversation") === false
      )
        setActive(result[0]!.conversation_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as conversas.");
    }
  }, [uid, active]);
  const loadMessages = useCallback(async () => {
    if (!uid || !active) return;
    try {
      let clearedAt = clearBefore.current.get(active);
      if (clearedAt === undefined) {
        const cleared = await rest<Array<{ cleared_at: string }>>("conversation_clears", `conversation_id=eq.${active}&select=cleared_at&limit=1`).catch(() => []);
        clearedAt = cleared?.[0]?.cleared_at || "";
        clearBefore.current.set(active, clearedAt);
      }
      const rows = await rest<Message[]>(
        "messages",
        `conversation_id=eq.${active}&select=id,conversation_id,sender_id,body,created_at${clearedAt ? `&created_at=gt.${encodeURIComponent(clearedAt)}` : ""}&order=created_at.asc&limit=200`,
      );
      const messageIds = (rows ?? []).map((message) => message.id);
      const [media, reactions] = await Promise.all([
        messageIds.length ? rest<Array<{ id: string; message_id: string | null; conversation_id: string; object_path: string; media_type: "photo" | "audio"; mime_type: string; size_bytes: number }>>("message_media", `message_id=in.(${messageIds.join(",")})&select=id,message_id,conversation_id,object_path,media_type,mime_type,size_bytes&order=created_at.asc`).catch(() => []) : Promise.resolve([]),
        messageIds.length ? rest<Array<{ message_id: string; user_id: string; reaction: string }>>("message_reactions", `message_id=in.(${messageIds.join(",")})&select=message_id,user_id,reaction`).catch(() => []) : Promise.resolve([]),
      ]);
      const mediaWithUrls = await Promise.all((media ?? []).map(async (item) => {
        const cached = mediaUrlCache.current.get(item.object_path);
        if (cached && cached.expiresAt > Date.now()) return { ...item, url: cached.url };
        const url = await signedUrl(item.object_path, "message-media").catch(() => "");
        if (url) mediaUrlCache.current.set(item.object_path, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
        return { ...item, url };
      }));
      setItems((rows ?? []).map((message) => ({ ...message, media: mediaWithUrls.filter((item) => item.message_id === message.id), reactions: (reactions ?? []).filter((reaction) => reaction.message_id === message.id) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as mensagens.");
    }
  }, [uid, active]);
  useEffect(() => {
    if (!uid) {
      nav({ to: "/entrar" });
      return;
    }
    void loadThreads();
  }, [uid, nav, loadThreads]);
  useEffect(() => {
    if (!uid) return;
    const refresh = window.setInterval(() => void loadThreads(), 5000);
    return () => window.clearInterval(refresh);
  }, [uid, loadThreads]);
  useEffect(() => {
    if (!active) return;
    void loadMessages();
    void rpc("mark_conversation_read", { p_conversation_id: active }).catch(() => undefined);
    const channel = getRealtimeClient()
      .channel(`conversation:${active}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${active}`,
        },
        (payload) => {
          const message = payload.new as Message;
          setItems((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message],
          );
          if (message.sender_id !== uid)
            void rpc("mark_conversation_read", { p_conversation_id: active }).catch(
              () => undefined,
            );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void loadMessages();
      });
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [active, uid, loadMessages]);
  useEffect(() => {
    if (!active) return;
    const refresh = window.setInterval(() => void loadMessages(), 5000);
    return () => window.clearInterval(refresh);
  }, [active, loadMessages]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uid || !active || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      await rest("messages", "", {
        method: "POST",
        body: JSON.stringify({ conversation_id: active, sender_id: uid, body: draft.trim() }),
      });
      setDraft("");
      await rpc("mark_conversation_read", { p_conversation_id: active }).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar mensagem.");
    } finally {
      setBusy(false);
    }
  }
  async function sendAttachment(file: File, mediaType: "photo" | "audio") {
    if (!uid || !active) return;
    if (file.size > (mediaType === "photo" ? 10 : 20) * 1024 * 1024) return setError(mediaType === "photo" ? "A foto deve ter no máximo 10 MB." : "O áudio deve ter no máximo 20 MB.");
    setBusy(true); setError("");
    let uploadedPath = "";
    try {
      const ext = file.type.includes("ogg") ? "ogg" : file.type.includes("mp4") ? "m4a" : file.type.includes("mpeg") ? "mp3" : file.type.includes("wav") ? "wav" : file.type.includes("aac") ? "aac" : "webm";
      const proposedPath = `${uid}/${active}/${newObjectId()}.${ext}`;
      const stored = await upload(proposedPath, file, "message-media");
      uploadedPath = stored.objectPath;
      const messageRows = await rest<Array<{ id: string }>>("messages", "select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ conversation_id: active, sender_id: uid, body: mediaType === "photo" ? "Foto" : "Áudio" }) });
      const messageId = messageRows?.[0]?.id;
      if (!messageId) throw new Error("O servidor não confirmou a mensagem.");
      await rest("message_media", "", { method: "POST", body: JSON.stringify({ message_id: messageId, conversation_id: active, owner_id: uid, object_path: stored.objectPath, media_type: mediaType, mime_type: stored.mimeType, size_bytes: stored.size }) });
      await loadMessages();
    } catch (cause) {
      if (uploadedPath) await fetch(`${window.location.origin}${import.meta.env.BASE_URL}api/media/delete?bucket=message-media&path=${encodeURIComponent(uploadedPath)}`, { method: "DELETE", headers: { Authorization: `Bearer ${getSession()?.access_token || ""}` } }).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o anexo.");
    } finally { setBusy(false); }
  }
  async function attachPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return setError("Escolha uma foto JPG, PNG, WEBP ou GIF.");
    await sendAttachment(file, "photo");
  }
  async function toggleRecording() {
    if (recording && recorder.current) { recorder.current.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); audioChunks.current = [];
      current.ondataavailable = (event) => { if (event.data.size) audioChunks.current.push(event.data); };
      current.onstop = () => { stream.getTracks().forEach((track) => track.stop()); const blob = new Blob(audioChunks.current, { type: current.mimeType || "audio/webm" }); if (blob.size) void sendAttachment(new File([blob], "audio-message.webm", { type: blob.type }), "audio"); };
      current.start(); recorder.current = current; setRecording(true); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Permita acesso ao microfone para gravar áudio."); }
  }
  async function toggleReaction(messageId: string, reaction: string) {
    if (!uid) return;
    const exists = items.find((item) => item.id === messageId)?.reactions?.some((item) => item.user_id === uid && item.reaction === reaction);
    try {
      if (exists) await rest("message_reactions", `message_id=eq.${messageId}&user_id=eq.${uid}&reaction=eq.${reaction}`, { method: "DELETE" });
      else await rest("message_reactions", "", { method: "POST", body: JSON.stringify({ message_id: messageId, user_id: uid, reaction }) });
      await loadMessages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível reagir à mensagem."); }
  }
  async function deleteMessage(message: Message) {
    if (message.sender_id !== uid || !window.confirm("Apagar esta mensagem para todos na conversa?")) return;
    try {
      await rest("messages", `id=eq.${message.id}&sender_id=eq.${uid}`, { method: "DELETE" });
      await Promise.all((message.media ?? []).map((media) => removeUpload(media.object_path, "message-media").catch(() => undefined)));
      await loadMessages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível apagar a mensagem."); }
  }
  async function clearConversation() {
    if (!active || !window.confirm("Limpar esta conversa apenas para você? A outra pessoa continuará vendo as mensagens.")) return;
    try {
      const cutoff = await rpc<string>("clear_my_conversation", { p_conversation_id: active });
      clearBefore.current.set(active, cutoff);
      setItems([]);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível limpar a conversa."); }
  }
  return (
    <main className="member-page">
      <MemberNav current="mensagens" />
      <div className="social-content">
        <section className="social-title">
          <span className="auth-kicker">CONVERSAS PRIVADAS</span>
          <h1>Mensagens</h1>
          <p>Converse com respeito. Você pode bloquear uma pessoa em Explorar.</p>
        </section>
        {error && <p className="social-message">{error}</p>}
        <div className="chat-layout">
          <aside className="thread-list">
            <div className="thread-list-heading">
              Suas conversas{" "}
              <button className="icon-button" title="Atualizar" onClick={() => void loadThreads()}>
                <RefreshCw size={15} />
              </button>
            </div>
            {threads.map((t) => (
              <button
                key={t.conversation_id}
                className={active === t.conversation_id ? "thread-item selected" : "thread-item"}
                onClick={() => setActive(t.conversation_id)}
              >
                <span className="post-avatar">{t.name.slice(0, 1).toUpperCase()}</span>
                <span>{t.name}</span>
              </button>
            ))}
            {threads.length === 0 && (
              <p className="empty-thread">
                Suas conversas aparecerão aqui. Inicie uma pela tela Explorar.
              </p>
            )}
          </aside>
          <section className="chat-panel">
            {active && threads.some((t) => t.conversation_id === active) ? (
              <>
                <div className="chat-top">
                  <b>{threads.find((t) => t.conversation_id === active)?.name}</b>
                  <button
                    className="icon-button"
                    title="Atualizar mensagens"
                    aria-label="Atualizar mensagens"
                    onClick={() => void loadMessages()}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button className="icon-button" title="Limpar conversa para você" aria-label="Limpar conversa para você" onClick={() => void clearConversation()}><Trash2 size={16} /></button>
                </div>
                <div className="chat-messages">
                  {items.map((m) => (
                    <article className={m.sender_id === uid ? "chat-bubble own" : "chat-bubble"} key={m.id}>
                      {m.media?.map((media) => media.media_type === "photo" ? <img className="chat-photo" key={media.id} src={media.url} alt="Foto enviada na conversa" /> : <audio className="chat-audio" key={media.id} src={media.url} controls preload="metadata" />)}
                      {!m.media?.length && <p className={m.body.startsWith("sticker:") ? "chat-sticker" : undefined}>{m.body.startsWith("sticker:") ? m.body.slice(8) : m.body}</p>}
                      <time>{new Date(m.created_at).toLocaleString("pt-BR")}</time>
                      <div className="chat-reactions">
                        {reactionOptions.map((reaction) => {
                          const count = m.reactions?.filter((item) => item.reaction === reaction.key).length || 0;
                          const mine = m.reactions?.some((item) => item.user_id === uid && item.reaction === reaction.key);
                          return <button type="button" key={reaction.key} aria-label={reaction.label} aria-pressed={mine} className={mine ? "is-active" : ""} onClick={() => void toggleReaction(m.id, reaction.key)}>{reaction.emoji}{count > 0 && <small>{count}</small>}</button>;
                        })}
                        {m.sender_id === uid && <button type="button" aria-label="Apagar mensagem" title="Apagar mensagem" onClick={() => void deleteMessage(m)}><Trash2 size={14} /></button>}
                      </div>
                    </article>
                  ))}
                  {items.length === 0 && (
                    <p className="social-empty">Comece a conversa com respeito e consentimento.</p>
                  )}
                </div>
                <form className="chat-compose" onSubmit={send}>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => void attachPhoto(event)} />
                  <button type="button" className="icon-button" aria-label="Enviar foto" disabled={busy} onClick={() => fileInput.current?.click()}><ImagePlus size={19} /></button>
                  <button type="button" className="icon-button" aria-label={recording ? "Parar gravação" : "Gravar áudio"} disabled={busy} onClick={() => void toggleRecording()}>{recording ? <Square size={18} /> : <Mic size={19} />}</button>
                  <div className="chat-emoji-picker">
                    <button type="button" className="icon-button" aria-label="Emojis" onClick={() => setEmojiOpen((value) => !value)}><Smile size={19} /></button>
                    {emojiOpen && <div className="chat-emoji-menu">{emojiChoices.map((emoji) => <button type="button" key={emoji} onClick={() => { setDraft((value) => `${value}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
                  </div>
                  <div className="chat-emoji-picker">
                    <button type="button" className="icon-button" aria-label="Figurinhas" onClick={() => setStickersOpen((value) => !value)}><Sticker size={19} /></button>
                    {stickersOpen && <div className="chat-emoji-menu chat-sticker-menu">{stickers.map((sticker, index) => <button type="button" key={`${sticker}-${index}`} aria-label={`Enviar figurinha ${sticker}`} onClick={() => { setDraft(`sticker:${sticker}`); setStickersOpen(false); window.setTimeout(() => document.querySelector<HTMLFormElement>(".chat-compose")?.requestSubmit(), 0); }}>{sticker}</button>)}</div>}
                  </div>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={2000}
                    placeholder="Digite uma mensagem…"
                  />
                  {recording && <span className="recording-indicator">Gravando…</span>}
                  <button className="button button-primary" disabled={busy || !draft.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="social-empty">Selecione uma conversa para ver as mensagens.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
