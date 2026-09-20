import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Viajante";

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">Na Bagagem</p>
            <h1 className="mt-1 text-3xl font-bold text-neutral-950">
              Olá, {name}
            </h1>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800"
            >
              Sair
            </button>
          </form>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-950">
            Seu espaço de viagens
          </h2>
          <p className="mt-2 text-neutral-600">
            Sua conta está autenticada. A estrutura do dashboard começa aqui.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Minhas viagens", "Mapa", "Feed"].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-neutral-200 p-5"
              >
                <h3 className="font-semibold text-neutral-900">{item}</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Em construção.
                </p>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-neutral-700"
        >
          ← Voltar para o início
        </Link>
      </div>
    </main>
  );
}
