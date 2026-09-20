"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
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
      <button disabled={loading} className="w-full rounded-xl bg-gray-950 px-4 py-3 font-semibold text-white disabled:opacity-50">
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-center text-sm text-gray-600">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-gray-950">Criar conta</Link>
      </p>
    </form>
  );
}
