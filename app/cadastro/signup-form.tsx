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
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resending, setResending] = useState(false);

  async function sendVerification(address: string) {
    const response = await fetch("/api/auth/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address, callbackURL: "/login" }),
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      throw new Error(authFeedback(details, "signup", response.status));
    }
  }

  async function resendVerification() {
    if (!pendingEmail || resending) return;
    setResending(true);
    setError("");
    setMsg("");
    try {
      await sendVerification(pendingEmail);
      setMsg("Solicitação de verificação enviada ao serviço de autenticação. Confira sua caixa de entrada e spam. A entrega do e-mail pode levar alguns minutos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível solicitar o e-mail de confirmação.");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const invalid = signupValidation(name,email,password);
    if (invalid) { setError(invalid); return; }
    setLoading(true);
    setError("");
    setMsg("");
    setPendingEmail("");

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(authFeedback(result,"signup",response.status));
        return;
      }

      if (result.user && result.token) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const address = email.trim();
      setPendingEmail(address);
      try {
        await sendVerification(address);
        setMsg("Cadastro recebido e verificação solicitada ao serviço de autenticação. Confira sua caixa de entrada e spam. A entrega ainda não está confirmada.");
      } catch {
        setError("A conta pode ter sido criada, mas não foi possível solicitar o e-mail de confirmação. Use o botão abaixo para tentar novamente.");
      }
    } catch {
      setError("Não foi possível conectar ao serviço de cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block text-sm font-medium">Seu nome<input name="name" autoComplete="name" maxLength={100} required aria-label="Nome" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
      <label className="block text-sm font-medium">E-mail<input name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required type="email" aria-label="E-mail" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
      <label className="block text-sm font-medium">Senha<input name="password" autoComplete="new-password" aria-describedby="password-help" required minLength={8} maxLength={128} type="password" aria-label="Senha" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" /></label><p id="password-help" className="text-xs text-neutral-500">Use pelo menos 8 caracteres.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {msg && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{msg}</p>}
      {pendingEmail && <button type="button" disabled={resending} onClick={resendVerification} className="w-full rounded-xl border px-4 py-3 font-semibold disabled:opacity-60">{resending ? "Solicitando..." : "Reenviar confirmação"}</button>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-neutral-600">Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-neutral-950">Entrar</Link>
      </p>
    </form>
  );
}
