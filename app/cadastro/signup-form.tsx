"use client";

import { FormEvent, useState } from "react";
import { authFeedback, signupValidation } from "@/lib/auth-feedback";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function authRequest(endpoint: string, body: Record<string, string>) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nested = typeof result.error === "object" ? result.error : undefined;
      const authCode = result.code || nested?.code;
      if (authCode === "INVALID_OTP" || authCode === "INVALID_VERIFICATION_CODE") {
        throw new Error("Código incorreto ou expirado. Confira o e-mail mais recente ou solicite outro código.");
      }
      throw new Error(authFeedback(result, "signup", response.status));
    }
    return result;
  }

  async function resendVerification() {
    if (resending || !email.trim()) return;
    setResending(true);
    setError("");
    setMsg("");
    try {
      await authRequest("email-otp/send-verification-otp", {
        email: email.trim(),
        type: "email-verification",
      });
      setCode("");
      setMsg("Novo código solicitado. Utilize apenas o código de 6 dígitos do e-mail mais recente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reenviar o código.");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMsg("");
    setLoading(true);
    try {
      if (step === "verify") {
        if (!/^\d{6}$/.test(code.trim())) {
          setError("Digite o código de 6 dígitos recebido por e-mail.");
          return;
        }
        await authRequest("email-otp/verify-email", {
          email: email.trim(),
          otp: code.trim(),
        });
        setMsg("E-mail confirmado! Redirecionando para o login...");
        router.push("/login?verified=1");
        router.refresh();
        return;
      }

      const invalid = signupValidation(name, email, password);
      if (invalid) {
        setError(invalid);
        return;
      }
      const result = await authRequest("sign-up/email", {
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (result.user && result.token) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setStep("verify");
      setPassword("");
      setMsg("Enviamos um código de 6 dígitos para seu e-mail. Digite-o abaixo para ativar sua conta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {step === "signup" ? (
        <>
          <label className="block text-sm font-medium">Seu nome<input name="name" autoComplete="name" maxLength={100} required aria-label="Nome" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          <label className="block text-sm font-medium">E-mail<input name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required type="email" aria-label="E-mail" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          <label className="block text-sm font-medium">Senha<input name="password" autoComplete="new-password" aria-describedby="password-help" required minLength={8} maxLength={128} type="password" aria-label="Senha" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          <p id="password-help" className="text-xs text-neutral-500">Use pelo menos 8 caracteres.</p>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
            Confirme o código enviado para <strong>{email}</strong>.
          </div>
          <label className="block text-sm font-medium">Código de confirmação
            <input
              required type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6}" maxLength={6} aria-label="Código de 6 dígitos"
              placeholder="000000" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.35em]"
            />
          </label>
          <button type="button" disabled={resending || loading} onClick={resendVerification} className="w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-60">
            {resending ? "Reenviando..." : "Reenviar código"}
          </button>
          <button type="button" disabled={loading} onClick={() => { setStep("signup"); setCode(""); setError(""); setMsg(""); }} className="w-full text-sm text-neutral-600 underline">
            Corrigir meus dados
          </button>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {msg && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{msg}</p>}
      <button type="submit" disabled={loading || resending} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Aguarde..." : step === "verify" ? "Confirmar e-mail" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-neutral-600">Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-neutral-950">Entrar</Link>
      </p>
    </form>
  );
}
