import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripDetailClient from "./trip-detail-client";
import TripMap from "./trip-map";
import TripTools from "./trip-tools";
import TripWeather from "./trip-weather";
import TripCurrency from "./trip-currency";
import TripShareTools from "./trip-share-tools";
import TripCollaboration from "./trip-collaboration";
import TripReservations from "./trip-reservations";
import TripSummary from "./trip-summary";
import TripCalendar from "./trip-calendar";
import SiteHeader from "@/app/components/site-header";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
  if (!trip) notFound();

  const [{ data: locations }, { data: events }, { data: member }] = await Promise.all([
    supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("day_index").order("event_date").order("start_time"),
    supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle(),
  ]);

  const isOwner = trip.user_id === user.id;
  const canEdit = isOwner || member?.role === "editor";

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-50 px-3 pb-8 pt-24 sm:px-6">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Minhas viagens</Link>

        <div className="mt-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:mt-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Viagem</p>
              <h1 className="mt-2 break-words text-2xl font-bold text-neutral-950 sm:text-3xl">{trip.title}</h1>
              <p className="mt-2 break-words text-sm text-neutral-600 sm:text-base">{trip.description || "Adicione uma descrição para essa viagem."}</p>
              <p className="mt-4 text-sm text-neutral-500">{trip.start_date || "Sem data de início"}{trip.end_date ? " → " + trip.end_date : ""}</p>
            </div>
            <span className="self-start rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
              {isOwner ? "Proprietário" : canEdit ? "Colaborador · Editor" : "Colaborador · Visualizador"}
            </span>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm sm:mt-7 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><h2 className="text-xl font-bold text-neutral-950">Mapa da viagem</h2><p className="mt-1 text-sm text-neutral-500">Destinos localizados automaticamente aparecem aqui na ordem do roteiro.</p></div>
            <span className="self-start rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 sm:self-auto">{(locations ?? []).filter((l:any)=>l.latitude != null && l.longitude != null).length} pontos no mapa</span>
          </div>
          <TripMap tripId={trip.id} canEdit={canEdit} startDate={trip.start_date} endDate={trip.end_date} locations={locations ?? []} events={(events ?? []).map((event:any) => { const location=(locations ?? []).find((item:any)=>item.id===event.location_id); return { ...event, latitude:event.latitude ?? location?.latitude ?? null, longitude:event.longitude ?? location?.longitude ?? null }; })} />
        </section>

        <TripDetailClient tripId={trip.id} initialLocations={locations ?? []} initialEvents={events ?? []} canEdit={canEdit} />
        <TripCalendar startDate={trip.start_date} endDate={trip.end_date} events={(events ?? []).map((event:any)=>({ ...event, location_name:(locations ?? []).find((l:any)=>l.id===event.location_id)?.name || null }))} />
        <TripTools tripId={trip.id} canEdit={canEdit} />
        <TripSummary tripId={trip.id} initialEvents={events ?? []} />

        <div className="mt-5 grid gap-5 lg:mt-7 lg:grid-cols-2 lg:gap-7">
          <TripCurrency />
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Resumo rápido</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="rounded-2xl bg-neutral-50 p-3 sm:p-4"><b className="text-xl sm:text-2xl">{(locations ?? []).length}</b><p className="text-xs text-neutral-500">destinos</p></div>
              <div className="rounded-2xl bg-neutral-50 p-3 sm:p-4"><b className="text-xl sm:text-2xl">{(events ?? []).length}</b><p className="text-xs text-neutral-500">atividades</p></div>
              <div className="rounded-2xl bg-neutral-50 p-3 sm:p-4"><b className="text-xl sm:text-2xl">{(events ?? []).filter((e:any)=>e.status==="completed").length}</b><p className="text-xs text-neutral-500">concluídas</p></div>
            </div>
          </div>
        </div>

        <TripWeather locations={locations ?? []} />
        <TripReservations tripId={trip.id} />
        <TripShareTools tripId={trip.id} />
        <TripCollaboration tripId={trip.id} />
      </div>
    </main>
  );
}