import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getContext(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null, canEdit: false };
  const { data: trip } = await supabase.from("trips").select("id,user_id").eq("id", id).maybeSingle();
  if (!trip) return { supabase, user, trip: null, canEdit: false };
  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle();
  return { supabase, user, trip, canEdit: trip.user_id === user.id || member?.role === "editor" };
}
function normalizeStatus(value: unknown) { return value === "completed" || value === "in_progress" || value === "future" ? value : "future"; }
function normalizeColor(value: unknown) { const color = String(value || "").trim(); return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111827"; }
function normalizeReminder(value: unknown) { const minutes = Number(value); return Number.isInteger(minutes) && minutes >= 0 && minutes <= 10080 ? minutes : null; }
function normalizeUrl(value: unknown) { const raw = String(value || "").trim(); if (!raw) return null; try { const url = new URL(raw); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
function normalizeDay(value: unknown) { const day = Number(value); return Number.isInteger(day) && day >= 1 ? day : 1; }
function normalizeOrder(value: unknown) { const order = Number(value); return Number.isInteger(order) && order >= 0 ? order : 0; }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user, trip, canEdit } = await getContext(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });
  const body = await request.json(); const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Informe o título do evento." }, { status: 400 });
  const dayIndex = normalizeDay(body.day_index);
  let orderIndex = normalizeOrder(body.order_index);
  if (body.order_index === undefined) {
    const { data: lastEvent } = await supabase.from("trip_events")
      .select("order_index")
      .eq("trip_id", id)
      .eq("day_index", dayIndex)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderIndex = lastEvent && Number.isInteger(lastEvent.order_index) ? Number(lastEvent.order_index) + 1 : 0;
  }
  const { data, error } = await supabase.from("trip_events").insert({
    trip_id: id, location_id: body.location_id || null, title,
    description: String(body.description || "").trim() || null, event_date: body.event_date || null,
    start_time: body.start_time || null, end_time: body.end_time || null, day_index: dayIndex, order_index: orderIndex,
    status: normalizeStatus(body.status), color: normalizeColor(body.color),
    reservation_name: String(body.reservation_name || "").trim() || null,
    confirmation_code: String(body.confirmation_code || "").trim() || null,
    reservation_url: normalizeUrl(body.reservation_url), reminder_minutes: normalizeReminder(body.reminder_minutes),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user, trip, canEdit } = await getContext(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const body = await request.json(); const updates: Record<string, unknown> = {};
  if (body.title !== undefined) { const title = String(body.title || "").trim(); if (!title) return NextResponse.json({ error: "Informe o título da atividade." }, { status: 400 }); updates.title = title; }
  if (body.description !== undefined) updates.description = String(body.description || "").trim() || null;
  if (body.event_date !== undefined) updates.event_date = body.event_date || null;
  if (body.start_time !== undefined) updates.start_time = body.start_time || null;
  if (body.end_time !== undefined) updates.end_time = body.end_time || null;
  if (body.location_id !== undefined) updates.location_id = body.location_id || null;
  if (body.day_index !== undefined) updates.day_index = normalizeDay(body.day_index);
  if (body.order_index !== undefined) updates.order_index = normalizeOrder(body.order_index);
  if (body.status !== undefined) updates.status = normalizeStatus(body.status);
  if (body.color !== undefined) updates.color = normalizeColor(body.color);
  if (body.reservation_name !== undefined) updates.reservation_name = String(body.reservation_name || "").trim() || null;
  if (body.confirmation_code !== undefined) updates.confirmation_code = String(body.confirmation_code || "").trim() || null;
  if (body.reservation_url !== undefined) updates.reservation_url = normalizeUrl(body.reservation_url);
  if (body.reminder_minutes !== undefined) updates.reminder_minutes = normalizeReminder(body.reminder_minutes);
  const { data, error } = await supabase.from("trip_events").update(updates).eq("id", eventId).eq("trip_id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user, trip, canEdit } = await getContext(id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  if (!canEdit) return NextResponse.json({ error: "Você não tem permissão para editar esta viagem." }, { status: 403 });
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const { error } = await supabase.from("trip_events").delete().eq("id", eventId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
