import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  completeMemberRegistration,
  getSession,
  hasPrivateProfile,
} from "@/lib/supabase";

export const Route = createFileRoute("/completar-cadastro")({
  component: CompleteSignup,
});

/** Idade mínima exigida pela política 18+, replicada aqui para dar retorno imediato. */
function maximumAdultBirthDate() {
  const today = new Date();
  const year = today.getFullYear() - 18;
  const month = today.getMonth();
  const day = Math.min(today.getDate(), new Date(year, month + 1, 0).getDate());
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year = 0, month = 0, day = 0] = match.slice(1).map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
}

function CompleteSignup() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Quem já tem o registro privado (cadastro por e-mail) não precisa passar aqui.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!getSession()) {
        navigate({ to: "/entrar" });
        return;
      }
      try {
        if (await hasPrivateProfile() && !cancelled) navigate({ to: "/dashboard" });
      } catch {
        /* Sem leitura não bloqueia: o envio do formulário valida no banco. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const displayName = String(form.get("displayName") || "").trim();
    const birthDate = String(form.get("birthDate") || "");
    if (!isValidBirthDate(birthDate)) {
      setError("Informe uma data de nascimento válida.");
      return;
    }
    if (birthDate > maximumAdultBirthDate()) {
      setError("A plataforma é exclusiva para maiores de 18 anos.");
      return;
    }
    if (!form.get("terms")) {
      setError("Aceite os termos e a política de privacidade para continuar.");
      return;
    }
    setBusy(true);
    try {
      await completeMemberRegistration({ birthDate, fullName, displayName });
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível concluir o cadastro agora.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="hero-bg hero-bg-one" aria-hidden="true" />
      <div className="hero-bg hero-bg-two" aria-hidden="true" />
      <div className="hero-bg hero-bg-three" aria-hidden="true" />
      <div className="auth-bg-scrim" aria-hidden="true" />

      <a href="/" className="auth-brand">
        <img src="/sintoniamora-logo-horizontal.webp" alt="sexflow" />
      </a>
      <section className="auth-card">
        <span className="auth-kicker">QUASE LÁ</span>
        <h1>Complete seu cadastro</h1>
        <p>Falta confirmar sua idade para liberar a comunidade 18+.</p>
        <form onSubmit={submit}>
          <label>
            Nome completo
            <input name="fullName" required autoComplete="name" />
          </label>
          <label>
            Nome de exibição
            <input name="displayName" maxLength={40} autoComplete="nickname" />
          </label>
          <label>
            Data de nascimento
            <input
              name="birthDate"
              type="date"
              min="1900-01-01"
              max={maximumAdultBirthDate()}
              autoComplete="bday"
              required
            />
          </label>
          <label className="check-row">
            <input name="terms" type="checkbox" required /> Tenho 18 anos ou mais e aceito os{" "}
            <a href="/termos">termos e a política de privacidade</a>.
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? "Concluindo…" : "Concluir cadastro"}
          </button>
        </form>
      </section>
    </main>
  );
}