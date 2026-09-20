import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "Data não definida";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trips, error } = await supabase.from("trips").select("id,title,description,start_date,end_date,created_at").eq("user_id", user.id).order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

  const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Viajante";

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold tracking-wide text-neutral-500">NA BAGAGEM</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-950">Olá, {name}</h1><p className="mt-1 text-neutral-600">Organize suas viagens, lugares e memórias.</p></div>
          <div className="flex items-center gap-3"><Link href="/feed" className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800">Feed social</Link><Link href="/dashboard/configuracoes" className="rounded-xl border px-4 py-2 text-sm font-semibold">Configurações</Link><Link href="/dashboard/perfil" className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800">Perfil</Link><Link href="/dashboard/trips/new" className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">+ Nova viagem</Link><form action="/api/auth/logout" method="post"><button type="submit" className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800">Sair</button></form></div>
        </header>
        <section className="pt-9">
          <div><h2 className="text-2xl font-bold text-neutral-950">Minhas viagens</h2><p className="mt-1 text-sm text-neutral-500">{trips?.length ?? 0} {trips?.length === 1 ? "viagem cadastrada" : "viagens cadastradas"}</p></div>
          {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar suas viagens. Verifique se a estrutura do banco foi aplicada no Supabase.</div> : trips && trips.length > 0 ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{trips.map((trip) => <Link key={trip.id} href={`/dashboard/trips/${trip.id}`} className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-32 items-end rounded-xl bg-neutral-100 p-4"><span className="text-4xl">✈️</span></div><h3 className="mt-5 text-lg font-bold text-neutral-950 group-hover:underline">{trip.title}</h3><p className="mt-1 line-clamp-2 text-sm text-neutral-600">{trip.description || "Sem descrição ainda."}</p><p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-400">{formatDate(trip.start_date)} {trip.end_date ? `→ ${formatDate(trip.end_date)}` : ""}</p></Link>)}</div> : <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center"><div className="text-5xl">🧳</div><h3 className="mt-4 text-xl font-bold text-neutral-950">Sua primeira viagem começa aqui</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">Crie uma viagem e depois vamos adicionar destinos, eventos, mapa e fotos.</p><Link href="/dashboard/trips/new" className="mt-6 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Criar minha primeira viagem</Link></div>}
        </section>
      </div>
    </main>
  );
}