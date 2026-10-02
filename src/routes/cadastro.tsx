import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { isConfigured, signUp } from "@/lib/supabase";
export const Route = createFileRoute("/cadastro")({ component: Register });

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

function Register() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const fullName = String(f.get("fullName") || "").trim(),
      displayName = String(f.get("displayName") || "").trim();
    const birthDate = String(f.get("birthDate") || ""),
      email = String(f.get("email") || "").trim(),
      password = String(f.get("password") || "");
    if (!isValidBirthDate(birthDate)) {
      setError("Informe uma data de nascimento válida.");
      return;
    }
    if (birthDate > maximumAdultBirthDate()) {
      setError("O cadastro é exclusivo para maiores de 18 anos.");
      return;
    }
    if (!f.get("terms")) {
      setError("Aceite os termos e a política de privacidade para continuar.");
      return;
    }
    setBusy(true);
    try {
      const signup = await signUp({ fullName, displayName, birthDate, email, password });
      if (signup.access_token && signup.refresh_token) navigate({ to: "/dashboard" });
      else navigate({ to: "/confirmar-email" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      {/* Hero Animated Background Layers */}
      <div className="hero-bg hero-bg-one" aria-hidden="true" />
      <div className="hero-bg hero-bg-two" aria-hidden="true" />
      <div className="hero-bg hero-bg-three" aria-hidden="true" />
      <div className="auth-bg-scrim" aria-hidden="true" />

      <a href="/" className="auth-brand">
        <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
      </a>
      <section className="auth-card">
        <span className="auth-kicker">COMUNIDADE 18+</span>
        <h1>Crie sua conta</h1>
        <p>Seus dados pessoais ficam privados por padrão.</p>
        {!isConfigured() && (
          <div className="backend-alert">
            Backend ainda não conectado. Configure as variáveis Supabase indicadas no README.
          </div>
        )}
        <form onSubmit={submit}>
          <label>
            Nome completo
            <input name="fullName" required autoComplete="name" />
          </label>
          <label>
            Nome de exibição
            <input name="displayName" required maxLength={40} />
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
          <label>
            E-mail
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              minLength={10}
              required
              autoComplete="new-password"
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
            {busy ? "Criando conta…" : "Criar conta grátis"}
          </button>
        </form>
        <p className="auth-switch">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
