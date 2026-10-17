import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transaction } from "@/lib/neon/db";
import { optimizeDayEventOrder, type ItineraryEvent } from "@/lib/itinerary-optimization";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("id,user_id").eq("id", id).maybeSingle();
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });
  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", id).eq("user_id", user.id).maybeSingle();
  if (trip.user_id !== user.id && member?.role !== "editor") return NextResponse.json({ error: "Sem permissão para editar." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const day = Number(body.day);
  if (!Number.isInteger(day) || day < 1) return NextResponse.json({ error: "Dia inválido." }, { status: 400 });

  const { data: events, error } = await supabase.from("trip_events")
    .select("id,location_id,latitude,longitude,order_index,start_time,reservation_name,confirmation_code")
    .eq("trip_id", id).eq("day_index", day).order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const dayEvents: ItineraryEvent[] = events || [];
  const locationIds = [...new Set(dayEvents.flatMap(event => event.location_id ? [event.location_id] : []))];
  const { data: locations, error: locationError } = locationIds.length
    ? await supabase.from("trip_locations").select("id,latitude,longitude").eq("trip_id", id).in("id", locationIds)
    : { data: [], error: null };
  if (locationError) return NextResponse.json({ error: "Não foi possível carregar os locais das atividades." }, { status: 503 });
  let order: string[];
  try { order = optimizeDayEventOrder(dayEvents, locations || []); }
  catch { return NextResponse.json({ error: "O dia precisa ter pelo menos 2 atividades com localização." }, { status: 400 }); }
  try {
    await transaction(async client => {
      for (const [index, eventId] of order.entries()) {
        const result = await client.query("update trip_events set order_index=$1 where id=$2 and trip_id=$3 and day_index=$4 returning id", [index,eventId,id,day]);
        if (result.rows.length !== 1) throw new Error("Itinerário alterado durante a otimização.");
      }
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a ordem. Recarregue o itinerário e tente novamente." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, order });
}
