import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Check,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Radio,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSession, rest, rpc } from "@/lib/supabase";
import { MemberNav } from "@/components/member-nav";

export const Route = createFileRoute("/admin")({ component: Admin });
type Overview = {
  users: number;
  active_users: number;
  suspended_users: number;
  active_subscriptions: number;
  premium_subscriptions: number;
  pending_reports: number;
  live_now: number;
};
type User = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  city: string | null;
  state: string | null;
  access_status: "active" | "suspended";
  access_reason: string;
  plan_id: string | null;
  plan_status: string | null;
  role: string | null;
};
type Plan = { id: string; name: string; price_cents: number; active: boolean };
type Feature = { plan_id: string; feature_key: string; feature_value: number };
type Report = {
  report_id: string;
  reporter_name: string | null;
  target_user_id: string | null;
  target_name: string | null;
  target_post_id: string | null;
  post_body: string | null;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};
type Tab = "overview" | "users" | "plans" | "reports";
const statuses = ["ACTIVE", "PENDING", "PAST_DUE", "CANCELED", "EXPIRED", "REFUNDED"];

function Admin() {
  const uid = getSession()?.user.id;
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [admin, moderator, superAdmin] = await Promise.all([
        rpc<boolean>("current_user_admin"),
        rpc<boolean>("current_user_moderator"),
        rpc<boolean>("current_user_super_admin"),
      ]);
      setIsAdmin(Boolean(admin));
      setIsSuperAdmin(Boolean(superAdmin));
      setAuthorized(Boolean(admin || moderator));
      if (moderator && !admin) setTab("reports");
      if (admin) {
        const [summary, planRows, featureRows] = await Promise.all([
          rpc<Overview>("admin_overview"),
          rest<Plan[]>(
            "subscription_plans",
            "select=id,name,price_cents,active&order=price_cents.asc",
          ),
          rest<Feature[]>(
            "plan_features",
            "select=plan_id,feature_key,feature_value&order=plan_id.asc",
          ),
        ]);
        setOverview(summary);
        setPlans(planRows ?? []);
        setFeatures(featureRows ?? []);
      }
      setError("");
    } catch (e) {
      setAuthorized(false);
      setError(e instanceof Error ? e.message : "Não foi possível validar o administrador.");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(
        (await rpc<User[]>("admin_list_users", { p_search: search, p_limit: 100, p_offset: 0 })) ??
          [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar usuários.");
    }
  }, [search]);
  const loadReports = useCallback(async () => {
    try {
      setReports(
        (await rpc<Report[]>("admin_list_reports", { p_status: "ALL", p_limit: 100 })) ?? [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao listar denúncias.");
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      void navigate({ to: "/entrar" });
      return;
    }
    void load();
  }, [uid, navigate, load]);
  useEffect(() => {
    if (authorized && tab === "users") void loadUsers();
  }, [authorized, tab, loadUsers]);
  useEffect(() => {
    if (authorized && tab === "reports") void loadReports();
  }, [authorized, tab, loadReports]);

  async function act(label: string, operation: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await operation();
      setMessage(label);
      await load();
      if (tab === "users") await loadUsers();
      if (tab === "reports") await loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "A operação não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  }
  function featureLabel(key: string) {
    return (
      (
        {
          max_profile_photos: "Fotos no perfil",
          max_profile_videos: "Vídeos no perfil",
          advanced_filters: "Filtros avançados",
          premium_features: "Recursos Premium",
        } as Record<string, string>
      )[key] ?? key.replaceAll("_", " ")
    );
  }

  if (authorized === null)
    return (
      <main className="member-page">
        <MemberNav current="admin" />
        <div className="social-content">
          <p className="social-empty">Validando acesso administrativo…</p>
        </div>
      </main>
    );
  if (!authorized)
    return (
      <main className="member-page">
        <MemberNav current="admin" />
        <div className="social-content">
          <div className="social-title">
            <span className="auth-kicker">ÁREA RESTRITA</span>
            <h1>Acesso não autorizado</h1>
            <p>Este painel só pode ser aberto por uma conta administradora.</p>
          </div>
          {error && <p className="social-message">{error}</p>}
          <a className="button button-outline" href="/dashboard">
            Voltar ao dashboard
          </a>
        </div>
      </main>
    );

  return (
    <main className="member-page admin-page">
      <MemberNav current="admin" />
      <div className="social-content">
        <div className="social-title dashboard-welcome">
          <span className="auth-kicker">CONTROLE DO SISTEMA</span>
          <h1>{isAdmin ? "Painel administrativo" : "Moderação da comunidade"}</h1>
          <p>
            {isAdmin
              ? "Usuários, planos, denúncias e atividade da plataforma."
              : "Revise denúncias e ajude a manter a comunidade segura."}
          </p>
        </div>
        <nav className="admin-tabs" aria-label="Seções administrativas">
          {[
            ...(isAdmin
              ? ([
                  ["overview", "Visão geral", LayoutDashboard],
                  ["users", "Usuários", Users],
                  ["plans", "Planos", CircleDollarSign],
                ] as const)
              : []),
            ["reports", "Denúncias", FileText] as const,
          ].map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        {message && (
          <p className="admin-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="social-message" role="alert">
            {error}
          </p>
        )}
        {tab === "overview" && (
          <>
            <section className="admin-stat-grid">
              <article>
                <span>
                  <Users />
                </span>
                <small>Contas cadastradas</small>
                <strong>{overview?.users ?? 0}</strong>
              </article>
              <article>
                <span>
                  <BadgeCheck />
                </span>
                <small>Contas ativas</small>
                <strong>{overview?.active_users ?? 0}</strong>
              </article>
              <article>
                <span>
                  <Ban />
                </span>
                <small>Contas suspensas</small>
                <strong>{overview?.suspended_users ?? 0}</strong>
              </article>
              <article>
                <span>
                  <CircleDollarSign />
                </span>
                <small>Assinaturas ativas</small>
                <strong>{overview?.active_subscriptions ?? 0}</strong>
              </article>
              <article>
                <span>
                  <ShieldCheck />
                </span>
                <small>Planos Premium ativos</small>
                <strong>{overview?.premium_subscriptions ?? 0}</strong>
              </article>
              <article>
                <span>
                  <FileText />
                </span>
                <small>Denúncias em análise</small>
                <strong>{overview?.pending_reports ?? 0}</strong>
              </article>
              <article>
                <span>
                  <Radio />
                </span>
                <small>Lives no ar</small>
                <strong>{overview?.live_now ?? 0}</strong>
              </article>
            </section>
            <div className="admin-dashboard-actions">
              <button className="button button-primary" onClick={() => setTab("users")}>
                Gerenciar usuários
              </button>
              <button className="button button-outline" onClick={() => setTab("plans")}>
                Gerenciar planos
              </button>
              <button className="button button-outline" onClick={() => setTab("reports")}>
                Revisar denúncias
              </button>
            </div>
            <p className="dashboard-muted">
              Alterações de assinatura pelo painel são manuais. O checkout e a cobrança recorrente
              ainda não estão conectados.
            </p>
          </>
        )}
        {tab === "users" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="auth-kicker">CONTAS</span>
                <h2>Gerenciar usuários</h2>
              </div>
            </div>
            <label className="admin-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
              />
              <button className="button button-outline" onClick={() => void loadUsers()}>
                Buscar
              </button>
            </label>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Papel</th>
                    <th>Cadastro e último acesso</th>
                    <th>Plano e status</th>
                    <th>Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <b>{user.display_name || "Sem nome"}</b>
                        <small>{user.email}</small>
                        <small>{[user.city, user.state].filter(Boolean).join(", ")}</small>
                      </td>
                      <td>
                        {user.role === "super_admin" ? (
                          <span className="admin-role">Administrador geral</span>
                        ) : (
                          <select
                            aria-label={`Papel de ${user.email}`}
                            value={user.role ?? "member"}
                            disabled={busy || user.user_id === uid}
                            onChange={(e) => void act("Papel do usuário atualizado.", () => rpc("admin_set_user_role", { p_user_id: user.user_id, p_role: e.target.value }))}
                          >
                            <option value="member">Membro</option>
                            <option value="moderator">Moderador</option>
                            {(isSuperAdmin || user.role === "admin") && <option value="admin">Administrador</option>}
                          </select>
                        )}
                      </td>
                      <td>
                        <small>Desde {new Date(user.created_at).toLocaleDateString("pt-BR")}</small>
                        <small>
                          {user.last_sign_in_at
                            ? `Acesso ${new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")}`
                            : "Ainda sem acesso"}
                        </small>
                      </td>
                      <td>
                        <select
                          aria-label={`Plano de ${user.email}`}
                          value={user.plan_id ?? "free"}
                          onChange={(e) => {
                            const plan = e.target.value;
                            void act("Plano atualizado manualmente.", () =>
                              rpc("admin_set_user_plan", {
                                p_user_id: user.user_id,
                                p_plan_id: plan,
                                p_status: plan === "free" ? "ACTIVE" : "ACTIVE",
                              }),
                            );
                          }}
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label={`Status do plano de ${user.email}`}
                          value={
                            statuses.includes(user.plan_status ?? "") ? user.plan_status! : "ACTIVE"
                          }
                          onChange={(e) =>
                            void act("Status do plano atualizado.", () =>
                              rpc("admin_set_user_plan", {
                                p_user_id: user.user_id,
                                p_plan_id: user.plan_id ?? "free",
                                p_status: e.target.value,
                              }),
                            )
                          }
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`admin-status ${user.access_status}`}>
                          {user.access_status === "active" ? "Ativa" : "Suspensa"}
                        </span>
                        {user.access_status === "suspended" && user.access_reason && (
                          <small>{user.access_reason}</small>
                        )}
                        <button
                          className="button button-outline admin-action"
                          disabled={busy || user.user_id === uid}
                          onClick={() => {
                            const suspend = user.access_status === "active";
                            const reason = suspend
                              ? (window.prompt("Motivo da suspensão da conta:") ?? "")
                              : "";
                            if (suspend && !reason.trim()) return;
                            void act(suspend ? "Conta suspensa." : "Acesso restaurado.", () =>
                              rpc("admin_set_user_access", {
                                p_user_id: user.user_id,
                                p_status: suspend ? "suspended" : "active",
                                p_reason: reason,
                              }),
                            );
                          }}
                        >
                          {user.access_status === "active" ? (
                            <>
                              <Ban size={15} />
                              Suspender
                            </>
                          ) : (
                            <>
                              <Check size={15} />
                              Reativar
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && <p className="dashboard-muted">Nenhuma conta encontrada.</p>}
          </section>
        )}
        {tab === "plans" && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="auth-kicker">CATÁLOGO</span>
                  <h2>Planos disponíveis</h2>
                </div>
              </div>
              <div className="admin-plan-list">
                {plans.map((plan) => (
                  <form
                    className="admin-plan-card"
                    key={plan.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      void act("Plano salvo.", () =>
                        rpc("admin_save_plan", {
                          p_plan_id: plan.id,
                          p_name: String(form.get("name")),
                          p_price_cents: Math.round(Number(form.get("price")) * 100),
                          p_active: form.get("active") === "on",
                        }),
                      );
                    }}
                  >
                    <label>
                      Identificador
                      <input value={plan.id} readOnly />
                    </label>
                    <label>
                      Nome
                      <input name="name" defaultValue={plan.name} required maxLength={80} />
                    </label>
                    <label>
                      Preço mensal (R$)
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={(plan.price_cents / 100).toFixed(2)}
                        required
                      />
                    </label>
                    <label className="admin-toggle">
                      <input name="active" type="checkbox" defaultChecked={plan.active} />
                      Plano ativo
                    </label>
                    <button className="button button-primary" disabled={busy}>
                      Salvar plano
                    </button>
                  </form>
                ))}
              </div>
              <p className="dashboard-muted">
                O preço exibido é informativo: salvar não inicia cobrança nem altera pagamentos
                existentes.
              </p>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="auth-kicker">RECURSOS E LIMITES</span>
                  <h2>Recursos de cada plano</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Plano</th>
                      <th>Recurso</th>
                      <th>Valor / limite</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature) => (
                      <tr key={`${feature.plan_id}-${feature.feature_key}`}>
                        <td>
                          {plans.find((p) => p.id === feature.plan_id)?.name ?? feature.plan_id}
                        </td>
                        <td>{featureLabel(feature.feature_key)}</td>
                        <td>
                          <input
                            className="admin-feature-value"
                            type="number"
                            min="0"
                            defaultValue={feature.feature_value}
                            aria-label={`${featureLabel(feature.feature_key)} no plano ${feature.plan_id}`}
                            onBlur={(e) => {
                              const value = Number(e.currentTarget.value);
                              if (value !== feature.feature_value)
                                void act("Recurso do plano atualizado.", () =>
                                  rpc("admin_save_plan_feature", {
                                    p_plan_id: feature.plan_id,
                                    p_feature_key: feature.feature_key,
                                    p_feature_value: value,
                                  }),
                                );
                            }}
                          />
                        </td>
                        <td>
                          <span className="dashboard-muted">
                            {feature.feature_key.startsWith("max_")
                              ? "itens"
                              : "0 desativado · 1 ativado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {tab === "reports" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="auth-kicker">SEGURANÇA DA COMUNIDADE</span>
                <h2>Denúncias</h2>
              </div>
              <button className="button button-outline" onClick={() => void loadReports()}>
                Atualizar
              </button>
            </div>
            <div className="admin-report-list">
              {reports.map((report) => (
                <article className="admin-report-card" key={report.report_id}>
                  <div className="admin-report-top">
                    <b>{report.reason}</b>
                    <span className={`report-status ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                    <time>{new Date(report.created_at).toLocaleString("pt-BR")}</time>
                  </div>
                  <p>
                    Denunciado por <b>{report.reporter_name || "Membro"}</b> ·{" "}
                    {report.target_name
                      ? `perfil: ${report.target_name}`
                      : `publicação de ${report.target_name || "membro"}`}
                  </p>
                  {report.post_body && <blockquote>{report.post_body}</blockquote>}
                  {report.details && <p>{report.details}</p>}
                  <div className="admin-report-actions">
                    <select
                      aria-label="Atualizar status da denúncia"
                      defaultValue={report.status}
                      id={`report-${report.report_id}`}
                    >
                      {["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="button button-outline"
                      onClick={() => {
                        const status = (
                          document.getElementById(`report-${report.report_id}`) as HTMLSelectElement
                        ).value;
                        void act("Denúncia atualizada.", () =>
                          rpc("admin_update_report", {
                            p_report_id: report.report_id,
                            p_status: status,
                            p_post_status: null,
                          }),
                        );
                      }}
                    >
                      Salvar análise
                    </button>
                    {report.target_post_id && (
                      <button
                        className="button button-outline"
                        onClick={() =>
                          void act("Publicação removida e denúncia encerrada.", () =>
                            rpc("admin_update_report", {
                              p_report_id: report.report_id,
                              p_status: "RESOLVED",
                              p_post_status: "REMOVED",
                            }),
                          )
                        }
                      >
                        Remover publicação
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {reports.length === 0 && (
              <p className="dashboard-muted">Nenhuma denúncia registrada.</p>
            )}
          </section>
        )}
        <p className="admin-audit-note">
          <ShieldCheck size={16} /> Alterações administrativas ficam registradas no histórico
          interno.
        </p>
      </div>
    </main>
  );
}
