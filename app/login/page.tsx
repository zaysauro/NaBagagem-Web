import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Voltar</Link>
        <h1 className="mt-8 text-3xl font-bold">Entrar no NaBagagem</h1>
        <p className="mt-2 text-gray-600">Acesse suas viagens e memórias.</p>
        <LoginForm />
      </div>
    </main>
  );
}
