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

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const invalid = signupValidation(name,email,password);
    if (invalid) { setError(invalid); return; }
    setLoading(true);
    setError("");
    setMsg("");

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

      setMsg("Cadastro recebido. Confira seu e-mail para confirmar a conta antes de entrar. Veja também a caixa de spam.");
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
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-neutral-600">Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-neutral-950">Entrar</Link>
      </p>
    </form>
  );
}
