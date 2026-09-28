"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Não foi possível enviar o e-mail."); return; }
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão.");
    } finally { setLoading(false); }
  }

  if (message) return <div className="mt-8 space-y-5">
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-semibold text-green-900">Confira seu e-mail</p>
      <p className="mt-1 text-sm leading-6 text-green-800">{message}</p>
    </div>
    <p className="text-sm leading-6 text-neutral-500">Se não aparecer em alguns minutos, confira também a pasta de spam ou lixo eletrônico.</p>
    <Link href="/login" className="block w-full rounded-xl bg-neutral-950 px-4 py-3 text-center font-semibold text-white">Voltar para entrar</Link>
  </div>;

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <input required type="email" autoComplete="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-200" />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Enviando..." : "Enviar link de recuperação"}</button>
    <p className="text-center text-sm text-neutral-600">Lembrou da senha?{" "}<Link href="/login" className="font-semibold text-neutral-950 underline">Entrar</Link></p>
  </form>;
}
