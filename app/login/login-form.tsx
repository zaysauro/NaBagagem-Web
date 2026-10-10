"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authFeedback } from "@/lib/auth-feedback";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(authFeedback(result,"login",response.status));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao serviço de login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <input
        required
        type="email"
        autoComplete="email" autoCapitalize="none" spellCheck={false}
        aria-label="E-mail" placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border px-4 py-3"
      />
      <div>
        <input
          required
          autoComplete="current-password"
          type="password"
          aria-label="Senha" placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        />
        <div className="mt-2 text-right">
          <Link
            href="/esqueci-senha"
            className="text-sm font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-950"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-center text-sm text-neutral-600">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-neutral-950">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
