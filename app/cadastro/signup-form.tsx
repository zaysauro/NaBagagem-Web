"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(data.session
      ? "Conta criada. Você já pode entrar."
      : "Conta criada. Verifique seu e-mail para confirmar o cadastro.");
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Nome</span>
        <input required value={displayName} onChange={e => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-950" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">E-mail</span>
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-950" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Senha</span>
        <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-950" />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-gray-950 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-center text-sm text-gray-600">
        Já tem conta? <Link href="/login" className="font-semibold text-gray-950">Entrar</Link>
      </p>
    </form>
  );
}
