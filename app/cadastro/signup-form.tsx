"use client";

import { FormEvent, useState } from "react";
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
    setLoading(true);
    setError("");
    setMsg("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao criar conta.");
        return;
      }

      if (result.authenticated) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setMsg(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input required placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-4 py-3" />
      <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border px-4 py-3" />
      <input required minLength={6} type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border px-4 py-3" />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {msg && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{msg}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-neutral-600">Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-neutral-950">Entrar</Link>
      </p>
    </form>
  );
}
