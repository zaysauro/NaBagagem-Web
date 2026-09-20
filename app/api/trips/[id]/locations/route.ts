import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function context(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null, canEdit: false };
  const { data: trip } = await supabase.from("trips").select("id,user_id").eq("id", id).maybeSingle();
  if (!trip) return { supabase, user, trip: null, canEdit: false };
  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle();
  return { supabase, user, trip, canEdit: trip.user_id === user.id || member?.role === "editor" };
}

async function geocode(query: string) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: { "User-Agent": "NaBagagem-Web/1.0 contact:nabagagemweb.vercel.app" }, next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const results = await response.json();
    return results[0] ? { latitude: Number(results[0].lat), longitude: Number(results[0].lon) } : null;
  } catch { return null; }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user, trip, canEdit } = await context(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });

  const body = await request.json(); const name = String(body.name || "").trim();
  const city = String(body.city || "").trim(); const country = String(body.country || "").trim();
  if (!name) return NextResponse.json({ error: "Informe o nome do destino." }, { status: 400 });
  let latitude = body.latitude !== undefined && body.latitude !== "" ? Number(body.latitude) : null;
  let longitude = body.longitude !== undefined && body.longitude !== "" ? Number(body.longitude) : null;
  if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    const point = await geocode([name, city, country].filter(Boolean).join(", "));
    latitude = point?.latitude ?? null; longitude = point?.longitude ?? null;
  }
  const { data, error } = await supabase.from("trip_locations").insert({
    trip_id: id, name, city: city || null, country: country || null,
    visited_at: body.visited_at || null, notes: String(body.notes || "").trim() || null,
    latitude, longitude, order_index: Number(body.order_index || 0),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user, trip, canEdit } = await context(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
  const { error } = await supabase.from("trip_locations").delete().eq("id", locationId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
