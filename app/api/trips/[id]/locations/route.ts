import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function ownedTrip(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null };
  const { data: trip } = await supabase.from("trips").select("id").eq("id", id).eq("user_id", user.id).single();
  return { supabase, user, trip };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await ownedTrip(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Informe o nome do destino." }, { status: 400 });

  const { data, error } = await supabase.from("trip_locations").insert({
    trip_id: id,
    name,
    city: String(body.city || "").trim() || null,
    country: String(body.country || "").trim() || null,
    visited_at: body.visited_at || null,
    notes: String(body.notes || "").trim() || null,
    order_index: Number(body.order_index || 0),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await ownedTrip(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) return NextResponse.json({ error: "Destino inválido." }, { status: 400 });

  const { error } = await supabase.from("trip_locations").delete().eq("id", locationId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}