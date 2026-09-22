import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/app/components/site-header";

function formatDate(value:string|null){if(!value)return "Data não definida";return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value+"T12:00:00"));}

export default async function DashboardPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:trips,error}=await supabase.from("trips").select("id,title,description,start_date,end_date,created_at").eq("user_id",user.id).order("start_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 const name=user.user_metadata?.display_name||user.email?.split("@")[0]||"Viajante";
 return <main className="min-h-screen bg-neutral-50 px-4 pb-10 pt-24 sm:px-6"><div className="mx-auto max-w-6xl"><SiteHeader name={name}/>
  <section className="pt-7 sm:pt-9">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="text-sm font-semibold text-neutral-500">Olá, {name}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">Minhas viagens</h1><p className="mt-1 text-sm text-neutral-500">{trips?.length??0} {(trips?.length??0)===1?"viagem cadastrada":"viagens cadastradas"}</p></div>
    <Link href="/dashboard/trips/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white">+ Nova viagem</Link>
   </div>
   {error?<div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar suas viagens. Verifique se a estrutura do banco foi aplicada no Supabase.</div>:
    trips&&trips.length>0?<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{trips.map(trip=>
      <Link key={trip.id} href={"/dashboard/trips/"+trip.id} className="group min-w-0 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
       <div className="flex h-32 items-end overflow-hidden rounded-2xl bg-neutral-100 p-4 sm:h-36"><span className="text-4xl" aria-hidden="true">✈</span></div>
       <h2 className="mt-4 break-words text-lg font-bold text-neutral-950 group-hover:underline">{trip.title}</h2>
       <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-neutral-600">{trip.description||"Sem descrição ainda."}</p>
       <div className="mt-4 flex flex-wrap gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-400"><span>{formatDate(trip.start_date)}</span>{trip.end_date&&<span>→ {formatDate(trip.end_date)}</span>}</div>
      </Link>
    )}</div>:
    <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white p-7 text-center sm:p-10"><div className="text-5xl" aria-hidden="true">🧳</div><h2 className="mt-4 text-xl font-bold text-neutral-950">Sua primeira viagem começa aqui</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">Crie uma viagem e depois adicione destinos, eventos, mapa, reservas, gastos e fotos.</p><Link href="/dashboard/trips/new" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white">Criar minha primeira viagem</Link></div>}
  </section>
 </div></main>;
}