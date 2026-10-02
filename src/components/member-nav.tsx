import type { ReactNode } from "react";
import { Compass, Home, LayoutDashboard, MessageCircle, Plus, UserRound } from "lucide-react";

const items = [
  ["dashboard", "Dashboard", "/dashboard"],
  ["feed", "Início", "/feed"],
  ["explorar", "Explorar", "/explorar"],
  ["mensagens", "Mensagens", "/mensagens"],
  ["notificacoes", "Notificações", "/notificacoes"],
  ["perfil", "Meu perfil", "/perfil"],
];

const mobileItems = [
  ["feed", "Início", "/feed", Home],
  ["explorar", "Explorar", "/explorar", Compass],
  ["publicar", "Publicar", "/feed#composer", Plus],
  ["mensagens", "Mensagens", "/mensagens", MessageCircle],
  ["perfil", "Perfil", "/perfil", UserRound],
  ["dashboard", "Painel", "/dashboard", LayoutDashboard],
] as const;

export function MemberNav({ current, children }: { current: string; children?: ReactNode }) {
  return (
    <>
      <header className="member-app-nav">
        <a className="member-app-brand" href="/dashboard">
          <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
        </a>
        <nav aria-label="Navegação da comunidade">
          {items.map(([id, label, url]) => (
            <a
              key={id}
              href={url}
              aria-current={current === id ? "page" : undefined}
              className={current === id ? "active" : ""}
            >
              {label}
            </a>
          ))}
          <a href="/planos" aria-current={current === "planos" ? "page" : undefined} className={current === "planos" ? "active" : ""}>Planos</a>
          {current === "admin" && <a href="/admin" aria-current="page" className="active">Admin</a>}
        </nav>
        <div className="member-app-actions">{children}</div>
      </header>
      <nav className="member-bottom-nav" aria-label="Navegação mobile">
        {mobileItems.map(([id, label, url, Icon]) => (
          <a
            key={id}
            href={url}
            aria-current={current === id ? "page" : undefined}
            className={`${current === id ? "active" : ""} ${id === "publicar" ? "publish" : ""}`}
          >
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
