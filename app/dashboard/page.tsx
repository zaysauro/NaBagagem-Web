import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">NaBagagem</p>
            <h1 className="text-3xl font-bold">Olá, {user?.user_metadata?.display_name ?? user?.email ?? "viajante"}.</h1>
          </div>
          <Link href="/" className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold">Início</Link>
        </header>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/viagens" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
            <h2 className="text-xl font-bold">Minhas viagens</h2>
            <p className="mt-2 text-gray-600">Planeje e organize suas viagens.</p>
          </Link>
          <Link href="/mapa" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
            <h2 className="text-xl font-bold">Mapa</h2>
            <p className="mt-2 text-gray-600">Explore lugares e eventos.</p>
          </Link>
          <Link href="/feed" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow">
            <h2 className="text-xl font-bold">Feed</h2>
            <p className="mt-2 text-gray-600">Compartilhe suas histórias.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
