import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { isConfigured, signIn } from "@/lib/supabase";
export const Route = createFileRoute("/entrar")({ component: Login });
function Login() {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const navigate=useNavigate();
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const f=new FormData(e.currentTarget);setBusy(true);try{await signIn(String(f.get("email")),String(f.get("password")));navigate({to:"/perfil"});}catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.");}finally{setBusy(false);}}
  return <main className="auth-page"><a href="/" className="auth-brand"><img src="/sintoniamora-wordmark.webp" alt="Sintoniamora"/></a><section className="auth-card"><span className="auth-kicker">BEM-VINDO DE VOLTA</span><h1>Entrar</h1><p>Acesse seu espaço com segurança.</p>{!isConfigured()&&<div className="backend-alert">Backend ainda não conectado. Configure as variáveis Supabase indicadas no README.</div>}<form onSubmit={submit}><label>E-mail<input name="email" type="email" required autoComplete="email"/></label><label>Senha<input name="password" type="password" required autoComplete="current-password"/></label>{error&&<div className="form-error" role="alert">{error}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy?"Entrando…":"Entrar na minha conta"}</button></form><p className="auth-switch">Ainda não tem conta? <Link to="/cadastro">Criar conta grátis</Link></p></section></main>;
}