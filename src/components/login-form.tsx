"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Command, LockKeyhole, Mail } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error || "Não foi possível entrar. Confira seus dados e tente novamente.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao workspace. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-brand">
        <span className="auth-mark"><Command size={19} /></span>
        <span className="auth-wordmark">nexo<span>.</span></span>
      </div>
      <div className="auth-heading">
        <span className="eyebrow">WORKSPACE</span>
        <h1 id="login-title">Boas-vindas de volta</h1>
        <p>Entre com o e-mail e a senha fornecidos pelo administrador.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="login-email">E-mail</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="login-email" name="email" type="email" autoComplete="username" inputMode="email" maxLength={254} required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.com" /></div>
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">Senha</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="login-password" name="password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" /></div>
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar no workspace"}
        </button>
      </form>
      <p className="auth-note">O acesso é gerenciado pelo administrador do site.</p>
    </section>
    <div className="auth-caption">NEXO <span>·</span> GESTÃO DE PROJETOS</div>
  </main>;
}
