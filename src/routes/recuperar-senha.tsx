import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  getSession,
  isConfigured,
  requestPasswordReset,
  resendPasswordRecovery,
  updatePassword,
  verifyPasswordRecoveryOtp,
} from "@/lib/supabase";

export const Route = createFileRoute("/recuperar-senha")({ component: RecuperarSenha });

/**
 * Recuperação de senha em uma tela só, com os dois caminhos que o Supabase
 * entrega: link (`type=recovery`, validado por `completeAuthCallback`) e código
 * de 6 números, como já acontece na confirmação de e-mail. Nos dois a pessoa
 * chega aqui com uma sessão válida e é só escolher a nova senha.
 */
function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"idle" | "code" | "new-password">(
    getSession() ? "new-password" : "idle",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setNotice(
        "Se houver uma conta com este e-mail, enviamos o link e o código para escolher uma nova senha.",
      );
      setMode("code");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
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
      await verifyPasswordRecoveryOtp(email, normalizedCode);
      setMode("new-password");
      setNotice("Código validado. Escolha a nova senha.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível validar o código.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      await navigate({ to: "/entrar" });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível atualizar a senha.",
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
      await resendPasswordRecovery(email);
      setNotice("Se houver uma conta com este e-mail, enviamos um novo código.");
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
        <span className="auth-kicker">RECUPERAR SENHA</span>
        <h1>
          {mode === "new-password" ? "Crie uma nova senha" : "Recupere seu acesso"}
        </h1>
        <p>
          {mode === "new-password"
            ? "Escolha uma senha nova para voltar a entrar na sua conta."
            : "Informe o e-mail do cadastro. Você recebe um link e um código para definir uma senha nova."}
        </p>
        {!isConfigured() && (
          <div className="backend-alert">
            Backend ainda não conectado. Configure as variáveis Supabase indicadas no README.
          </div>
        )}
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

        {mode === "new-password" ? (
          <form onSubmit={submitPassword}>
            <label>
              Nova senha
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Repita a nova senha
              <input
                name="confirmation"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button className="button button-primary auth-submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={mode === "code" ? submitCode : submitEmail}>
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
              {mode === "code" && (
                <label>
                  Código de recuperação
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
              )}
              <button className="button button-primary auth-submit" disabled={busy}>
                {busy
                  ? "Enviando…"
                  : mode === "code"
                    ? "Validar código"
                    : "Enviar e-mail de recuperação"}
              </button>
            </form>
            {mode === "code" && (
              <>
                <button
                  type="button"
                  className="button auth-submit"
                  disabled={resending || !email.trim()}
                  onClick={resend}
                >
                  {resending ? "Enviando…" : "Reenviar código"}
                </button>
                <button
                  type="button"
                  className="button auth-submit"
                  disabled={busy}
                  onClick={() => {
                    setMode("idle");
                    setCode("");
                    setNotice("");
                    setError("");
                  }}
                >
                  Usar outro e-mail
                </button>
              </>
            )}
          </>
        )}
        <p className="auth-switch">
          Lembrou a senha? <Link to="/entrar">Entrar na minha conta</Link>
        </p>
      </section>
    </main>
  );
}