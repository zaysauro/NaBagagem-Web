import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const defaults = {
  trip_reminders: true,
  reservation_reminders: true,
  social_notifications: true,
  weather_alerts: true,
  system_notifications: true,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("trip_reminders,reservation_reminders,social_notifications,weather_alerts,system_notifications")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data) return NextResponse.json({ preferences: data });

  const { data: created, error: createError } = await supabase
    .from("notification_preferences")
    .insert({ user_id: user.id, ...defaults })
    .select("trip_reminders,reservation_reminders,social_notifications,weather_alerts,system_notifications")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
  return NextResponse.json({ preferences: created });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, boolean> = {};

  for (const key of Object.keys(defaults)) {
    if (body[key] !== undefined) updates[key] = Boolean(body[key]);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nenhuma preferência informada." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("trip_reminders,reservation_reminders,social_notifications,weather_alerts,system_notifications")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ preferences: data });
}
