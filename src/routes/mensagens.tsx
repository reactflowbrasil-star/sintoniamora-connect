import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getRealtimeClient, getSession, rest, rpc } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { Send, RefreshCw } from "lucide-react";
export const Route = createFileRoute("/mensagens")({ component: Messages });
type Member = { conversation_id: string; user_id: string; joined_at: string };
type Profile = { id: string; display_name: string };
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
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
    [error, setError] = useState("");
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
      const rows = await rest<Message[]>(
        "messages",
        `conversation_id=eq.${active}&select=id,conversation_id,sender_id,body,created_at&order=created_at.asc&limit=200`,
      );
      setItems(rows ?? []);
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
                    onClick={() => void loadMessages()}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="chat-messages">
                  {items.map((m) => (
                    <article
                      className={m.sender_id === uid ? "chat-bubble own" : "chat-bubble"}
                      key={m.id}
                    >
                      <p>{m.body}</p>
                      <time>{new Date(m.created_at).toLocaleString("pt-BR")}</time>
                    </article>
                  ))}
                  {items.length === 0 && (
                    <p className="social-empty">Comece a conversa com respeito e consentimento.</p>
                  )}
                </div>
                <form className="chat-compose" onSubmit={send}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={2000}
                    required
                    placeholder="Digite uma mensagem…"
                  />
                  <button className="button button-primary" disabled={busy}>
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
