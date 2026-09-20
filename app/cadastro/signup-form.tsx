"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        setMsg("Conta criada. Redirecionando...");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setMsg(
        "Conta criada. Confira seu e-mail para confirmar a conta antes de entrar."
      );
    } catch (err) {
      console.error("Erro ao criar conta:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível criar a conta. Tente novamente.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input
        required
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border px-4 py-3"
      />

      <input
        required
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border px-4 py-3"
      />

      <input
        required
        minLength={6}
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border px-4 py-3"
      />

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {msg && (
        <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Criando..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-neutral-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-neutral-950">
          Entrar
        </Link>
      </p>
    </form>
  );
}
