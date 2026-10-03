import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Crown, X } from "lucide-react";
import { rest } from "@/lib/supabase";

export const Route = createFileRoute("/planos")({ component: Plans });

type Plan = { id: string; name: string; price_cents: number };
type Feature = { plan_id: string; feature_key: string; feature_value: number };
const labels: Record<string, string> = {
  max_profile_photos: "Fotos no perfil",
  max_profile_videos: "Vídeos no perfil",
  advanced_filters: "Filtros avançados",
  premium_features: "Recursos Premium",
};

function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      rest<Plan[]>(
        "subscription_plans",
        "active=eq.true&select=id,name,price_cents&order=price_cents.asc",
      ),
      rest<Feature[]>("plan_features", "select=plan_id,feature_key,feature_value"),
    ])
      .then(([planRows, featureRows]) => {
        setPlans(planRows ?? []);
        setFeatures(featureRows ?? []);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar os planos."),
      );
  }, []);

  const free = plans.find((plan) => plan.id === "free");
  const premium = plans.find((plan) => plan.id === "premium");
  const freeFeatures = features.filter((feature) => feature.plan_id === "free");
  const premiumFeatures = features.filter((feature) => feature.plan_id === "premium");
  const price = premium
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        premium.price_cents / 100,
      )
    : "R$ 49,90";

  function value(rows: Feature[], key: string) {
    const feature = rows.find((item) => item.feature_key === key);
    if (!feature) return "—";
    if (key.startsWith("max_")) return `Até ${feature.feature_value}`;
    return feature.feature_value > 0 ? (
      <Check size={18} aria-label="Incluído" />
    ) : (
      <X size={18} aria-label="Não incluído" />
    );
  }

  return (
    <main className="member-page plans-page">
      <header className="member-app-nav">
        <a className="member-app-brand" href="/">
          <img src="/sintoniamora-logo-horizontal.webp" alt="Sintoniamora" />
        </a>
        <nav aria-label="Navegação principal">
          <a href="/cadastro">Criar conta</a>
          <a href="/entrar">Entrar</a>
        </nav>
      </header>
      <section className="plans-content">
        <span className="auth-kicker">ESCOLHA O SEU PLANO</span>
        <h1>Sintoniamora para o seu ritmo</h1>
        <p className="plans-intro">
          Comece grátis e amplie sua experiência quando quiser. Você precisa ter 18 anos ou mais.
        </p>
        {error && (
          <p className="social-message" role="status">
            {error}
          </p>
        )}
        {!error && plans.length === 0 && <p className="social-empty">Carregando planos…</p>}
        <div className="plan-cards">
          {[free, premium]
            .filter((plan): plan is Plan => Boolean(plan))
            .map((plan) => {
              const rows = plan.id === "free" ? freeFeatures : premiumFeatures;
              return (
                <article
                  className={`plan-card ${plan.id === "premium" ? "featured" : ""}`}
                  key={plan.id}
                >
                  <div className="plan-card-heading">
                    {plan.id === "premium" && <Crown size={22} aria-hidden="true" />}
                    <h2>{plan.name}</h2>
                  </div>
                  <p className="plan-price">
                    {plan.price_cents === 0
                      ? "Grátis"
                      : new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(plan.price_cents / 100)}
                    {plan.price_cents > 0 && <small>/mês</small>}
                  </p>
                  <ul>
                    {rows.map((feature) => (
                      <li key={feature.feature_key}>
                        <span>
                          {labels[feature.feature_key] ?? feature.feature_key.replaceAll("_", " ")}
                        </span>
                        <b>{value(rows, feature.feature_key)}</b>
                      </li>
                    ))}
                  </ul>
                  {plan.id === "free" ? (
                    <a className="button button-outline" href="/cadastro">
                      Começar grátis
                    </a>
                  ) : (
                    <button
                      className="button button-primary"
                      disabled
                      title="O gateway de pagamento ainda não foi conectado"
                    >
                      Assinar Premium — {price}
                    </button>
                  )}
                </article>
              );
            })}
        </div>
        <p className="plans-payment-note">
          A assinatura Premium só será ativada após confirmação segura do pagamento pelo servidor. O
          checkout ainda não está disponível.
        </p>
      </section>
    </main>
  );
}
