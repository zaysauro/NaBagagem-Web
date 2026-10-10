"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "@neondatabase/auth/next";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setError("As senhas não são iguais.");
    setLoading(true);
    try {
      const auth = createAuthClient();
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) { setError("Link inválido. Solicite uma nova recuperação de senha."); return; }
      const { error: updateError } = await auth.resetPassword({ newPassword: password, token });
      if (updateError) { setError("Link inválido ou expirado. Solicite uma nova recuperação."); return; }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally { setLoading(false); }
  }

  if (success) return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 font-bold text-white">N</div>
      <h1 className="mt-5 text-2xl font-bold text-neutral-950">Senha atualizada</h1>
      <p className="mt-2 text-neutral-600">Sua senha foi alterada com sucesso.</p>
      <Link href="/login" className="mt-6 block rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white">Entrar com a nova senha</Link>
    </div>
  </main>;

  return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 sm:px-6">
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <Link href="/login" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Voltar para entrar</Link>
      <div className="mt-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 font-bold text-white">N</div>
        <h1 className="mt-5 text-3xl font-bold text-neutral-950">Nova senha</h1>
        <p className="mt-2 text-neutral-600">Escolha uma nova senha para sua conta.</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input required minLength={8} type="password" autoComplete="new-password" aria-label="Nova senha" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-200" />
        <input required minLength={8} type="password" autoComplete="new-password" aria-label="Confirmar nova senha" placeholder="Confirmar nova senha" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-200" />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Atualizando..." : "Atualizar senha"}</button>
      </form>
    </div>
  </main>;
}
