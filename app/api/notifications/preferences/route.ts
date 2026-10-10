import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";

export const runtime = "nodejs";
const defaults = {
  trip_reminders: true,
  reservation_reminders: true,
  social_notifications: true,
  weather_alerts: true,
  system_notifications: true,
};
const fields = Object.keys(defaults) as (keyof typeof defaults)[];
const selection = fields.join(",");

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const result = await query(`select ${selection} from notification_preferences where user_id=$1`, [user.id]);
    return NextResponse.json({ preferences: { ...defaults, ...(result.rows[0] ?? {}) } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as notificações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const changes = fields.filter(key => Object.prototype.hasOwnProperty.call(body, key));
    if (!changes.length) return NextResponse.json({ error: "Nenhuma preferência informada." }, { status: 400 });
    if (changes.some(key => typeof body[key] !== "boolean")) return NextResponse.json({ error: "Preferências inválidas." }, { status: 400 });
    const values = fields.map(key => body[key] ?? defaults[key]);
    const result = await query(
      `insert into notification_preferences (user_id,${selection}) values ($1,$2,$3,$4,$5,$6)
       on conflict (user_id) do update set ${changes.map(key => `${key}=excluded.${key}`).join(",")}, updated_at=now()
       returning ${selection}`,
      [user.id, ...values],
    );
    return NextResponse.json({ preferences: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar as notificações." }, { status: 500 });
  }
}
