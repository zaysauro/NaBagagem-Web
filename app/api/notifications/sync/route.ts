import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function dayDiff(a: string, b: string) {
  const x = new Date(a + "T12:00:00Z").getTime();
  const y = new Date(b + "T12:00:00Z").getTime();
  return Math.round((x - y) / 86400000);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const until = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const [{ data: trips }, { data: events }] = await Promise.all([
    supabase.from("trips").select("id,title,start_date,end_date")
      .eq("user_id", user.id).gte("start_date", todayKey).lte("start_date", until).order("start_date"),
    supabase.from("trip_events").select("id,trip_id,title,event_date,start_time")
      .eq("event_date", todayKey).order("start_time")
  ]);

  const tripIds = new Set((trips || []).map((trip) => trip.id));
  const ownEvents = (events || []).filter((event) => tripIds.has(event.trip_id));
  const rows: Array<Record<string, string | null>> = [];

  for (const trip of trips || []) {
    if (!trip.start_date) continue;
    const days = dayDiff(trip.start_date, todayKey);
    const when = days === 0 ? "começa hoje" : days === 1 ? "começa amanhã" : "começa em " + days + " dias";
    rows.push({
      user_id: user.id, type: "trip_reminder", title: "Sua viagem " + when, body: trip.title,
      href: "/dashboard/trips/" + trip.id, dedupe_key: "trip:" + trip.id + ":" + trip.start_date + ":" + days, actor_id: null
    });
  }

  for (const event of ownEvents) {
    rows.push({
      user_id: user.id, type: "trip_reminder",
      title: event.start_time ? "Atividade hoje às " + event.start_time.slice(0, 5) : "Atividade hoje",
      body: event.title, href: "/dashboard/trips/" + event.trip_id,
      dedupe_key: "event:" + event.id + ":" + todayKey, actor_id: null
    });
  }

  if (rows.length) {
    const { error } = await supabase.from("notifications").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: rows.length });
}
