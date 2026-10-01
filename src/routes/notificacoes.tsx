import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getSession, rest } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";
import { CheckCheck, Bell } from "lucide-react";
export const Route = createFileRoute("/notificacoes")({ component: Notifications });
type Notice = {
  id: string;
  actor_id: string | null;
  kind: string;
  target_type: string | null;
  target_id: string | null;
  read_at: string | null;
  created_at: string;
};
type Profile = { id: string; display_name: string };
const labels: Record<string, string> = {
  follow: "começou a seguir você",
  like: "curtiu uma publicação sua",
  comment: "comentou em uma publicação sua",
  message: "enviou uma mensagem",
  platform: "enviou um aviso",
};
function Notifications() {
  const session = getSession(),
    uid = session?.user.id,
    nav = useNavigate();
  const [rows, setRows] = useState<Notice[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const ns = await rest<Notice[]>(
        "notifications",
        `recipient_id=eq.${uid}&select=id,actor_id,kind,target_type,target_id,read_at,created_at&order=created_at.desc&limit=100`,
      );
      setRows(ns ?? []);
      const ids = [
        ...new Set((ns ?? []).map((x) => x.actor_id).filter((x): x is string => Boolean(x))),
      ];
      const ps = ids.length
        ? await rest<Profile[]>("profiles", `id=in.(${ids.join(",")})&select=id,display_name`)
        : [];
      setNames(Object.fromEntries((ps ?? []).map((p) => [p.id, p.display_name])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar notificações.");
    }
  }, [uid]);
  useEffect(() => {
    if (!uid) {
      nav({ to: "/entrar" });
      return;
    }
    void load();
  }, [uid, nav, load]);
  async function mark(id: string) {
    try {
      const now = new Date().toISOString();
      await rest("notifications", `id=eq.${id}&recipient_id=eq.${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ read_at: now }),
      });
      setRows(rows.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível marcar como lida.");
    }
  }
  async function markAll() {
    const unread = rows.filter((n) => !n.read_at);
    if (!unread.length) return;
    const now = new Date().toISOString();
    try {
      await rest("notifications", `recipient_id=eq.${uid}&read_at=is.null`, {
        method: "PATCH",
        body: JSON.stringify({ read_at: now }),
      });
      setRows(rows.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível marcar todas como lidas.");
    }
  }
  return (
    <main className="member-page">
      <MemberNav current="notificacoes" />
      <div className="social-content">
        <div className="social-title">
          <span className="auth-kicker">ATIVIDADE DA CONTA</span>
          <h1>Notificações</h1>
          <p>Acompanhe interações recentes na comunidade.</p>
        </div>
        <div className="notification-tools">
          <span>{rows.filter((n) => !n.read_at).length} não lidas</span>
          <button className="button button-outline" onClick={() => void markAll()}>
            <CheckCheck size={16} />
            Marcar todas como lidas
          </button>
        </div>
        {error && <p className="social-message">{error}</p>}
        <section className="notification-list">
          {rows.map((n) => (
            <article
              className={n.read_at ? "notification-item" : "notification-item unread"}
              key={n.id}
            >
              <span className="notification-icon">
                <Bell size={18} />
              </span>
              <div>
                <p>
                  <b>{n.actor_id ? names[n.actor_id] || "Um membro" : "Sintoniamora"}</b>{" "}
                  {labels[n.kind] || "interagiu com você"}.
                </p>
                <time>{new Date(n.created_at).toLocaleString("pt-BR")}</time>
              </div>
              {!n.read_at && (
                <button className="button button-outline" onClick={() => mark(n.id)}>
                  Lida
                </button>
              )}
            </article>
          ))}
        </section>
        {rows.length === 0 && <div className="social-empty">Você ainda não tem notificações.</div>}
      </div>
    </main>
  );
}
