import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function dayDiff(a: string, b: string) {
  const x = new Date(a + "T12:00:00Z").getTime();
  const y = new Date(b + "T12:00:00Z").getTime();
  return Math.round((x - y) / 86400000);
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeTime(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function currentMinutes(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { localDate?: string; localTime?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Backwards-compatible: the endpoint also works without a request body.
  }

  const now = new Date();
  const fallbackDate = now.toISOString().slice(0, 10);
  const todayKey =
    body.localDate?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || fallbackDate;

  const nowMinutes =
    currentMinutes(body.localTime ? `T${body.localTime}` : undefined) ??
    now.getUTCHours() * 60 + now.getUTCMinutes();

  const until = shiftDate(todayKey, 7);

  const [{ data: preferences, error: preferencesError }, { data: trips, error: tripsError }] =
    await Promise.all([
      supabase
        .from("notification_preferences")
        .select("trip_reminders,reservation_reminders")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("id,title,start_date,end_date")
        .eq("user_id", user.id)
        .order("start_date")
    ]);

  if (preferencesError) {
    return NextResponse.json({ error: preferencesError.message }, { status: 400 });
  }

  if (tripsError) {
    return NextResponse.json({ error: tripsError.message }, { status: 400 });
  }

  const tripRemindersEnabled = preferences?.trip_reminders ?? true;
  const reservationRemindersEnabled = preferences?.reservation_reminders ?? true;

  const tripIds = (trips || []).map((trip) => trip.id);

  let events: Array<{
    id: string;
    trip_id: string;
    title: string;
    event_date: string | null;
    start_time: string | null;
    reservation_name: string | null;
    confirmation_code: string | null;
    reminder_minutes: number | null;
  }> = [];

  if (tripIds.length && (tripRemindersEnabled || reservationRemindersEnabled)) {
    const { data, error } = await supabase
      .from("trip_events")
      .select(
        "id,trip_id,title,event_date,start_time,reservation_name,confirmation_code,reminder_minutes"
      )
      .in("trip_id", tripIds)
      .gte("event_date", todayKey)
      .lte("event_date", until)
      .order("event_date")
      .order("start_time");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    events = data || [];
  }

  const rows: Array<Record<string, string | null>> = [];

  if (tripRemindersEnabled) {
    for (const trip of trips || []) {
      if (!trip.start_date) continue;

      const days = dayDiff(trip.start_date, todayKey);
      if (days < 0 || days > 7) continue;

      const when =
        days === 0
          ? "começa hoje"
          : days === 1
            ? "começa amanhã"
            : "começa em " + days + " dias";

      rows.push({
        user_id: user.id,
        type: "trip_reminder",
        title: "Sua viagem " + when,
        body: trip.title,
        href: "/dashboard/trips/" + trip.id,
        dedupe_key: "trip:" + trip.id + ":" + trip.start_date + ":" + days,
        actor_id: null
      });
    }
  }

  for (const event of events) {
    if (!event.event_date) continue;

    const eventTime = normalizeTime(event.start_time);

    if (
      tripRemindersEnabled &&
      event.event_date === todayKey &&
      eventTime !== null
    ) {
      rows.push({
        user_id: user.id,
        type: "trip_reminder",
        title:
          "Atividade hoje às " +
          String(Math.floor(eventTime / 60)).padStart(2, "0") +
          ":" +
          String(eventTime % 60).padStart(2, "0"),
        body: event.title,
        href: "/dashboard/trips/" + event.trip_id,
        dedupe_key: "event:" + event.id + ":" + todayKey,
        actor_id: null
      });
    }

    if (!reservationRemindersEnabled || eventTime === null) continue;

    const reminderMinutes = Number.isInteger(event.reminder_minutes)
      ? event.reminder_minutes
      : null;

    if (reminderMinutes === null) continue;

    const reminderAt = eventTime - reminderMinutes;
    const dayOffset = Math.floor(reminderAt / 1440);
    const reminderMinuteOfDay = ((reminderAt % 1440) + 1440) % 1440;
    const reminderDate = shiftDate(event.event_date, dayOffset);

    let due = false;

    if (reminderDate < todayKey) {
      due = true;
    } else if (
      reminderDate === todayKey &&
      nowMinutes >= reminderMinuteOfDay
    ) {
      due = true;
    }

    if (!due) continue;

    const reservation = event.reservation_name
      ? "Reserva: " + event.reservation_name
      : "Reserva vinculada ao itinerário.";

    const code = event.confirmation_code
      ? " Código: " + event.confirmation_code
      : "";

    rows.push({
      user_id: user.id,
      type: "trip_reminder",
      title: "Lembrete: " + event.title,
      body: reservation + code,
      href: "/dashboard/trips/" + event.trip_id,
      dedupe_key:
        "reservation:" +
        event.id +
        ":" +
        event.event_date +
        ":" +
        (event.start_time || "") +
        ":" +
        reminderMinutes,
      actor_id: null
    });
  }

  if (rows.length) {
    const { error } = await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: rows.length });
}
