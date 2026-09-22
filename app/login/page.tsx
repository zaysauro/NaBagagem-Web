import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage(){
  return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 sm:px-6">
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Voltar</Link>
      <div className="mt-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 font-bold text-white">N</div>
        <h1 className="mt-5 text-3xl font-bold text-neutral-950">Entrar</h1>
        <p className="mt-2 text-neutral-600">Acesse sua conta do NaBagagem.</p>
      </div>
      <LoginForm/>
      <p className="mt-6 text-center text-sm text-neutral-500">Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-neutral-950 underline">Criar conta</Link></p>
    </div>
  </main>
}