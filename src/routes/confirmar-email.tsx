import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { isConfigured, resendSignupConfirmation, verifySignupOtp } from "@/lib/supabase";

export const Route = createFileRoute("/confirmar-email")({ component: ConfirmEmail });

function ConfirmEmail() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalizedCode = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Digite o código de 6 números recebido no e-mail.");
      return;
    }

    setBusy(true);
    try {
      await verifySignupOtp(email, normalizedCode);
      setNotice("E-mail confirmado. Sua conta já está ativa.");
      await navigate({ to: "/perfil" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível validar o código. Confira os dados e tente novamente.",
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
      setNotice("Se houver um cadastro pendente para este e-mail, enviaremos um novo código.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível reenviar o código.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <a href="/" className="auth-brand">
        <img src="/sintoniamora-logo-horizontal.webp" alt="sexflow" />
      </a>
      <section className="auth-card">
        <span className="auth-kicker">CONFIRMAÇÃO DE E-MAIL</span>
        <h1>Digite seu código</h1>
        <p>
          Informe o e-mail do cadastro. Se recebeu um código de 6 números, digite-o aqui. Se recebeu
          um link, abra-o no mesmo navegador para concluir a confirmação.
        </p>
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
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Código de confirmação
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              placeholder="000000"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
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
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? "Validando…" : "Confirmar e-mail"}
          </button>
        </form>
        <button
          type="button"
          className="button auth-submit"
          disabled={resending || !email.trim()}
          onClick={resend}
        >
          {resending ? "Enviando…" : "Reenviar confirmação"}
        </button>
        <p className="auth-switch">
          Já confirmou? <Link to="/entrar">Entrar na minha conta</Link>
        </p>
      </section>
    </main>
  );
}
