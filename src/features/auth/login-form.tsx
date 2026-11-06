"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import { Brand } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(
          result.error.status === 429
            ? "Muitas tentativas. Aguarde um minuto e tente novamente."
            : "Não foi possível entrar. Confira seu e-mail e sua senha.",
        );
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-art">
        <Brand />
        <div className="login-art-title">
          <span className="eyebrow">SUAS FINANÇAS, EM MOVIMENTO</span>
          <h1>
            Clareza hoje.
            <br />
            <span>
              Tranquilidade
              <br />
              amanhã.
            </span>
          </h1>
          <p>
            Um espaço para entender seu dinheiro
            <br />e dar o próximo passo com confiança.
          </p>
        </div>
        <div className="login-art-footer">
          <ShieldCheck size={15} />
          Seu espaço financeiro pessoal.
        </div>
      </section>
      <section className="login-form-section">
        <div className="login-form-container">
          <Brand />
          <span className="eyebrow">BOM TER VOCÊ DE VOLTA</span>
          <h2>Entre no seu Fluxo.</h2>
          <p>
            Seu dinheiro, suas escolhas.
            <br />
            Tudo começa com uma visão mais clara.
          </p>
          {!configured && (
            <div className="login-setup-message">
              Configure <code>DATABASE_URL</code>,{" "}
              <code>BETTER_AUTH_SECRET</code> e <code>BETTER_AUTH_URL</code> no
              servidor. Em seguida, execute as migrations e{" "}
              <code>npm run user:create</code>. O procedimento está no README.
            </div>
          )}
          <form onSubmit={submit} className="finance-form">
            <label className="form-field">
              <span>Seu e-mail</span>
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                maxLength={254}
              />
            </label>
            <label className="form-field">
              <span>Sua senha</span>
              <div className="password-wrap">
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha pessoal"
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button
              disabled={!configured || busy}
              type="submit"
              className="full-width"
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <>
                  Entrar no meu espaço
                  <ArrowRight size={17} />
                </>
              )}
            </Button>
          </form>
          <div className="login-private-note">
            <LockKeyhole size={12} />
            Acesso pessoal. Cadastro público desativado.
          </div>
        </div>
      </section>
    </div>
  );
}
