import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("title,description,cover_url,is_public").eq("id",id).eq("is_public",true).maybeSingle();
  return trip ? { title: trip.title+" | NaBagagem", description: trip.description || "Roteiro de viagem publicado no NaBagagem.", openGraph:{title:trip.title,description:trip.description||"Roteiro de viagem no NaBagagem.",images:trip.cover_url?[trip.cover_url]:[]} } : { title:"Viagem | NaBagagem" };
}

export default async function PublicTrip({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const supabase=await createClient();
  const {data:trip}=await supabase.from("trips").select("id,user_id,title,description,cover_url,start_date,end_date").eq("id",id).eq("is_public",true).maybeSingle();
  if(!trip)return <main className="min-h-screen bg-[#f4f1ea] p-8"><h1 className="text-2xl font-black">Roteiro não encontrado</h1></main>;
  const [{data:profile},{data:locations}]=await Promise.all([
    supabase.from("profiles").select("display_name,username,avatar_url").eq("id",trip.user_id).maybeSingle(),
    supabase.from("trip_locations").select("id,name,city,country,latitude,longitude,notes,order_index").eq("trip_id",id).order("order_index",{ascending:true})
  ]);
  return <main className="min-h-screen bg-[#f4f1ea] px-4 pb-16 pt-10 sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href={"/perfil/"+(profile?.username||trip.user_id)} className="text-sm font-semibold text-neutral-500">← {profile?.display_name||"Viajante"}</Link>
    <section className="mt-5 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">{trip.cover_url&&<img src={trip.cover_url} alt="" className="h-64 w-full object-cover sm:h-80" />}<div className="p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-neutral-400">Caderno de viagem</p><h1 className="mt-2 text-4xl font-black tracking-tight">{trip.title}</h1>{trip.description&&<p className="mt-4 max-w-3xl text-neutral-600">{trip.description}</p>}<div className="mt-5 text-sm text-neutral-500">{trip.start_date||"Data livre"} {trip.end_date&&"→ "+trip.end_date}</div></div></section>
    <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">O caminho</p><h2 className="mt-1 text-2xl font-black">Destinos do roteiro</h2><div className="mt-5 space-y-3">{(locations||[]).map((l:any,i:number)=><div key={l.id} className="flex gap-4 rounded-2xl bg-[#f8f7f3] p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{i+1}</div><div><h3 className="font-bold">{l.name}</h3><p className="text-sm text-neutral-500">{[l.city,l.country].filter(Boolean).join(", ")}</p>{l.notes&&<p className="mt-2 text-sm text-neutral-600">{l.notes}</p>}</div></div>)}{!(locations||[]).length&&<p className="text-sm text-neutral-500">Este roteiro ainda não possui destinos publicados.</p>}</div></section>
  </div></main>;
}