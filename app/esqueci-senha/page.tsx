import Link from "next/link";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 sm:px-6">
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <Link href="/login" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Voltar para entrar</Link>
      <div className="mt-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 font-bold text-white">N</div>
        <h1 className="mt-5 text-3xl font-bold text-neutral-950">Recuperar senha</h1>
        <p className="mt-2 text-neutral-600">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  </main>;
}
