import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripDetailClient from "./trip-detail-client";
import TripMap from "./trip-map";
import TripTools from "./trip-tools";
import TripWeather from "./trip-weather";
import TripCurrency from "./trip-currency";
import TripShareTools from "./trip-share-tools";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!trip) notFound();

  const [{ data: locations }, { data: events }] = await Promise.all([
    supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("day_index").order("event_date").order("start_time"),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Minhas viagens</Link>
        <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Viagem</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-950">{trip.title}</h1>
          <p className="mt-2 text-neutral-600">{trip.description || "Adicione uma descrição para essa viagem."}</p>
          <p className="mt-4 text-sm text-neutral-500">{trip.start_date || "Sem data de início"}{trip.end_date ? " → " + trip.end_date : ""}</p>
        </div>

        <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-bold text-neutral-950">Mapa da viagem</h2><p className="mt-1 text-sm text-neutral-500">Destinos localizados automaticamente aparecem aqui na ordem do roteiro.</p></div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{(locations ?? []).filter((l:any)=>l.latitude != null && l.longitude != null).length} pontos no mapa</span>
          </div>
          <TripMap locations={locations ?? []} events={(events ?? []).map((event:any) => { const location=(locations ?? []).find((item:any)=>item.id===event.location_id); return { ...event, latitude:event.latitude ?? location?.latitude ?? null, longitude:event.longitude ?? location?.longitude ?? null }; })} />
        </section>

        <TripDetailClient tripId={trip.id} initialLocations={locations ?? []} initialEvents={events ?? []} />
        <TripTools tripId={trip.id} />
        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <TripCurrency />
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Resumo rápido</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-neutral-50 p-4"><b className="text-2xl">{(locations ?? []).length}</b><p className="text-xs text-neutral-500">destinos</p></div>
              <div className="rounded-2xl bg-neutral-50 p-4"><b className="text-2xl">{(events ?? []).length}</b><p className="text-xs text-neutral-500">atividades</p></div>
              <div className="rounded-2xl bg-neutral-50 p-4"><b className="text-2xl">{(events ?? []).filter((e:any)=>e.status==="completed").length}</b><p className="text-xs text-neutral-500">concluídas</p></div>
            </div>
          </div>
        </div>
        <TripWeather locations={locations ?? []} />
        <TripShareTools tripId={trip.id} />
      </div>
    </main>
  );
}
