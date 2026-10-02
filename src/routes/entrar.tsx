import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { isConfigured, resendSignupConfirmation, signIn } from "@/lib/supabase";
export const Route = createFileRoute("/entrar")({ component: Login });
function Login() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    setNeedsConfirmation(false);
    const f = new FormData(e.currentTarget);
    const submittedEmail = String(f.get("email")).trim();
    setBusy(true);
    try {
      await signIn(submittedEmail, String(f.get("password")));
      navigate({ to: "/perfil" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível entrar.";
      setError(
        /email not confirmed|email_not_confirmed|confirm your email/i.test(message)
          ? "Confirme seu e-mail antes de entrar."
          : message,
      );
      setNeedsConfirmation(
        /email not confirmed|email_not_confirmed|confirm your email/i.test(message),
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setError("");
    setNotice("");
    setResending(true);
    try {
      await resendSignupConfirmation(email);
      setNotice(
        "Se o cadastro estiver aguardando confirmação, enviaremos um novo link para este endereço.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível reenviar o e-mail agora.");
    } finally {
      setResending(false);
    }
  }
  return (
    <main className="auth-page">
      <a href="/" className="auth-brand">
        <img src="/sintoniamora-wordmark.webp" alt="Sintoniamora" />
      </a>
      <section className="auth-card">
        <span className="auth-kicker">BEM-VINDO DE VOLTA</span>
        <h1>Entrar</h1>
        <p>Acesse seu espaço com segurança.</p>
        {!isConfigured() && (
          <div className="backend-alert">
            Backend ainda não conectado. Configure as variáveis Supabase indicadas no README.
          </div>
        )}
        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="form-message" role="status">
              {notice}
            </div>
          )}
          {needsConfirmation && (
            <button
              type="button"
              className="button auth-submit"
              disabled={resending || !email}
              onClick={resend}
            >
              {resending ? "Enviando…" : "Reenviar e-mail de confirmação"}
            </button>
          )}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? "Entrando…" : "Entrar na minha conta"}
          </button>
        </form>
        {(needsConfirmation || notice) && (
          <p className="auth-switch">
            Recebeu um código? <Link to="/confirmar-email">Confirmar e-mail</Link>
          </p>
        )}
        <p className="auth-switch">
          Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link>
        </p>
      </section>
    </main>
  );
}
