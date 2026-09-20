import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOwnedTrip(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null };
  const { data: trip } = await supabase.from("trips").select("id").eq("id", id).eq("user_id", user.id).single();
  return { supabase, user, trip };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await getOwnedTrip(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const body = await request.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Informe o título do evento." }, { status: 400 });

  const { data, error } = await supabase.from("trip_events").insert({
    trip_id: id,
    location_id: body.location_id || null,
    title,
    description: String(body.description || "").trim() || null,
    event_date: body.event_date || null,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await getOwnedTrip(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });

  const { error } = await supabase.from("trip_events").delete().eq("id", eventId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}