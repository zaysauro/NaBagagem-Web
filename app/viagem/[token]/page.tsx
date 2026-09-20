import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("id,title,description,start_date,end_date,share_token").eq("share_token", token).maybeSingle();

  if (!trip) return <main className="min-h-screen p-8"><h1 className="text-2xl font-bold">Viagem não encontrada</h1><p className="mt-2 text-neutral-500">O link pode ter expirado ou sido removido.</p></main>;

  const { data: locations } = await supabase.from("trip_locations").select("id,name,city,country,latitude,longitude,visited_at,notes,order_index").eq("trip_id", trip.id).order("order_index").order("created_at");
  const { data: events } = await supabase.from("trip_events").select("id,title,description,event_date,start_time,end_time,location_id,day_index,status,color").eq("trip_id", trip.id).order("day_index").order("event_date").order("start_time");

  return <main className="min-h-screen bg-neutral-50 px-6 py-10"><div className="mx-auto max-w-4xl">
    <Link href="/login" className="text-sm font-semibold text-neutral-500">NaBagagem</Link>
    <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm">
      <h1 className="text-3xl font-bold">{trip.title}</h1>
      {trip.description && <p className="mt-2 text-neutral-600">{trip.description}</p>}
      <p className="mt-3 text-sm text-neutral-400">{trip.start_date || "Data não definida"}{trip.end_date ? " → " + trip.end_date : ""}</p>
    </section>
    <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">Destinos</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{(locations || []).map(l => <div key={l.id} className="rounded-2xl bg-neutral-50 p-4"><b>{l.name}</b><p className="text-sm text-neutral-500">{[l.city,l.country].filter(Boolean).join(", ")}</p></div>)}</div>
    </section>
    <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">Itinerário</h2>
      <div className="mt-4 space-y-5">{Object.entries((events || []).reduce((acc:any,e:any)=>{(acc[e.day_index] ||= []).push(e);return acc},{})).map(([day,items]:any)=><div key={day}><h3 className="font-bold">Dia {day}</h3><div className="mt-2 grid gap-3 sm:grid-cols-2">{items.map((e:any)=><div key={e.id} className="rounded-2xl border-l-4 bg-neutral-50 p-4" style={{borderLeftColor:e.color}}><b>{e.title}</b><p className="text-xs text-neutral-500">{e.event_date || "Data não definida"}{e.start_time ? " · "+e.start_time : ""}</p>{e.description && <p className="mt-2 text-sm text-neutral-600">{e.description}</p>}</div>)}</div></div>)}</div>
    </section>
  </div></main>;
}
