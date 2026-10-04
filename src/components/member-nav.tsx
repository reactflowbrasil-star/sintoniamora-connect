import type { ReactNode } from "react";
import { Compass, Home, LayoutDashboard, MessageCircle, Plus, Radio, Search, UserRound } from "lucide-react";
import { useTours } from "@/components/tour/tour-provider";

// [id, label, url, tour id used for the "new" indicator]
const items = [
  ["dashboard", "Dashboard", "/dashboard", "global"],
  ["feed", "Início", "/feed", "feed"],
  ["explorar", "Explorar", "/explorar", "search"],
  ["busca", "Busca", "/busca", ""],
  ["livecam", "Livecam", "/livecam", ""],
  ["mensagens", "Mensagens", "/mensagens", "messages"],
  ["notificacoes", "Notificações", "/notificacoes", "notifications"],
  ["perfil", "Meu perfil", "/perfil", "profile"],
  ["planos", "Planos", "/planos", "plans"],
  ["ajuda", "Ajuda", "/ajuda", ""],
] as const;

const mobileItems = [
  ["feed", "Início", "/feed", Home, "feed"],
  ["explorar", "Explorar", "/explorar", Compass, "search"],
  ["livecam", "Livecam", "/livecam", Radio, ""],
  ["publicar", "Publicar", "/feed#composer", Plus, ""],
  ["mensagens", "Mensagens", "/mensagens", MessageCircle, "messages"],
  ["perfil", "Perfil", "/perfil", UserRound, "profile"],
  ["dashboard", "Painel", "/dashboard", LayoutDashboard, "global"],
] as const;

export function MemberNav({ current, children }: { current: string; children?: ReactNode }) {
  const { isSeen } = useTours();
  const isNew = (tourId: string, id: string) => Boolean(tourId) && current !== id && !isSeen(tourId);
  return (
    <>
      <header className="member-app-nav">
        <a className="member-app-brand" href="/dashboard">
          <img src="/sintoniamora-logo-horizontal.webp" alt="sexflow" />
        </a>
        <nav aria-label="Navegação da comunidade">
          {items.map(([id, label, url, tourId]) => (
            <a
              key={id}
              href={url}
              data-tour={`nav-${id}`}
              aria-current={current === id ? "page" : undefined}
              className={current === id ? "active" : ""}
            >
              {label}
              {isNew(tourId, id) && (
                <span className="tour-new-dot" role="img" aria-label="novo" />
              )}
            </a>
          ))}
          {current === "admin" && <a href="/admin" aria-current="page" className="active">Admin</a>}
        </nav>
        <div className="member-app-actions">{children}</div>
      </header>
      <nav className="member-bottom-nav" aria-label="Navegação mobile">
        {mobileItems.map(([id, label, url, Icon, tourId]) => (
          <a
            key={id}
            href={url}
            data-tour={`nav-${id === "dashboard" ? "dashboard" : id}`}
            aria-current={current === id ? "page" : undefined}
            className={`${current === id ? "active" : ""} ${id === "publicar" ? "publish" : ""}`}
          >
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
            {isNew(tourId, id) && <span className="tour-new-dot" role="img" aria-label="novo" />}
          </a>
        ))}
      </nav>
    </>
  );
}
