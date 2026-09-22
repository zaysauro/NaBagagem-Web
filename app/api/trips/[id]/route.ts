import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function context(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null };
  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
  return { supabase, user, trip };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await context(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const [{ data: locations, error: locationsError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("event_date").order("start_time"),
  ]);
  const { data: members } = await supabase
    .from("trip_members")
    .select("id,user_id,role,created_at,profiles:user_id(id,display_name,username,avatar_url)")
    .eq("trip_id", id)
    .order("created_at");

  if (locationsError || eventsError) return NextResponse.json({ error: "Não foi possível carregar a viagem." }, { status: 500 });
  const isOwner = trip.user_id === user.id;
  const currentMember = (members || []).find((member: any) => member.user_id === user.id);
  return NextResponse.json({
    trip,
    locations: locations ?? [],
    events: events ?? [],
    members: members ?? [],
    permissions: { isOwner, canEdit: isOwner || currentMember?.role === "editor" }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await context(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle();
  const canEdit = trip.user_id === user.id || member?.role === "editor";
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });

  const body = await request.json();
  const updates = {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim() || null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    budget_amount: body.budget_amount === "" || body.budget_amount == null ? null : Number(body.budget_amount),
    budget_currency: String(body.budget_currency || "BRL").trim().toUpperCase().slice(0,8) || "BRL",
  };
  if (!updates.title) return NextResponse.json({ error: "Informe o nome da viagem." }, { status: 400 });

  const { data, error } = await supabase.from("trips").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ trip: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, trip } = await context(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: "Somente o proprietário pode excluir a viagem." }, { status: 403 });

  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
