import Link from "next/link";
import { ArrowRight, CalendarDays, Luggage, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";
import SiteHeader from "@/app/components/site-header";

function formatDate(value:string|null){
  if(!value)return "Data não definida";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value+"T12:00:00"));
}

export default async function DashboardPage(){
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let trips: Array<{id:string;title:string;description:string|null;start_date:string|null;end_date:string|null}> = [];
  let error = false;
  try {
    const result = await query<typeof trips[number]>(
      "select id, title, description, start_date, end_date from trips where user_id = $1 order by start_date desc nulls last, created_at desc",
      [user.id],
    );
    trips = result.rows;
  } catch (cause) {
    console.error("dashboard trips query failed", cause);
    error = true;
  }
  const name=user.user_metadata?.display_name||user.email?.split("@")[0]||"Viajante";
  const count=trips?.length??0;

  return <main className="min-h-screen bg-neutral-50 px-4 pb-10 pt-24 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <SiteHeader name={name}/>

      <section className="pt-7 sm:pt-9">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-500">Olá, {name}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Minhas viagens</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 font-semibold"><Luggage size={15} aria-hidden="true"/>{count} {count===1?"viagem cadastrada":"viagens cadastradas"}</span>
              <span className="hidden text-neutral-300 sm:inline">•</span>
              <span>Seu próximo roteiro começa aqui.</span>
            </div>
          </div>
          <Link href="/dashboard/trips/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2">
            <Plus size={17} aria-hidden="true"/> Nova viagem
          </Link>
        </div>

        {error ? (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar suas viagens. Verifique se a estrutura do banco foi aplicada no Neon.</div>
        ) : trips&&trips.length>0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map(trip=>
              <Link key={trip.id} href={"/dashboard/trips/"+trip.id} aria-label={"Abrir viagem "+trip.title} className="group min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950">
                <div className="relative flex h-36 items-end overflow-hidden bg-[radial-gradient(circle_at_25%_20%,#ddd5c7,transparent_42%),linear-gradient(135deg,#eeeae2,#c0b7a6)] p-4 sm:h-40">
                  <div className="absolute inset-0 opacity-40 transition duration-700 group-hover:scale-105 group-hover:opacity-60 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,.35)_50%,transparent_70%)]"/>
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/75 text-neutral-900 shadow-sm backdrop-blur"><Luggage size={19} aria-hidden="true"/></span>
                </div>
                <div className="p-5">
                  <h2 className="break-words text-lg font-black text-neutral-950">{trip.title}</h2>
                  <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{trip.description||"Sem descrição ainda."}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400">
                      <CalendarDays size={14} aria-hidden="true"/>
                      <span>{formatDate(trip.start_date)}</span>{trip.end_date&&<span>→ {formatDate(trip.end_date)}</span>}
                    </div>
                    <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-neutral-900"/>
                  </div>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-[2rem] border border-dashed border-neutral-300 bg-white p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white"><Luggage size={25} aria-hidden="true"/></div>
            <h2 className="mt-5 text-xl font-black text-neutral-950">Sua primeira viagem começa aqui</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">Crie uma viagem e depois adicione destinos, eventos, mapa, reservas, gastos e fotos.</p>
            <Link href="/dashboard/trips/new" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"><Plus size={17} aria-hidden="true"/> Criar minha primeira viagem</Link>
          </div>
        )}
      </section>
    </div>
  </main>;
}
