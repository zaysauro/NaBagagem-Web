import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripDetailClient from "./trip-detail-client";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!trip) notFound();

  const [{ data: locations }, { data: events }] = await Promise.all([
    supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("event_date").order("start_time"),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">← Minhas viagens</Link>
        <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Viagem</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-950">{trip.title}</h1>
          <p className="mt-2 text-neutral-600">{trip.description || "Adicione uma descrição para essa viagem."}</p>
          <p className="mt-4 text-sm text-neutral-500">{trip.start_date || "Sem data de início"}{trip.end_date ? " → " + trip.end_date : ""}</p>
        </div>
        <TripDetailClient tripId={trip.id} initialLocations={locations ?? []} initialEvents={events ?? []} />
      </div>
    </main>
  );
}