import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: trip, error } = await supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).single();
  if (error || !trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const [{ data: locations, error: locationsError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("event_date").order("start_time"),
  ]);

  if (locationsError || eventsError) return NextResponse.json({ error: "Não foi possível carregar a viagem." }, { status: 500 });
  return NextResponse.json({ trip, locations: locations ?? [], events: events ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const updates = {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim() || null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
  };
  if (!updates.title) return NextResponse.json({ error: "Informe o nome da viagem." }, { status: 400 });

  const { data, error } = await supabase.from("trips").update(updates).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ trip: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { error } = await supabase.from("trips").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}