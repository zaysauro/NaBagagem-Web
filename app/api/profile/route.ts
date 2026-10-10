import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const [profile, stats] = await Promise.all([
      query("select display_name,username,avatar_url,bio from profiles where id=$1", [user.id]),
      query("select is_public from travel_stats where user_id=$1", [user.id]),
    ]);
    return NextResponse.json({ profile: profile.rows[0] ?? null, is_public: stats.rows[0]?.is_public ?? true });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o perfil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const display_name = String(body.display_name || "").trim().slice(0, 80);
    const username = String(body.username || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) || null;
    const bio = String(body.bio || "").trim().slice(0, 500);
    const avatar_url = String(body.avatar_url || "").trim() || null;
    const result = await query(
      `insert into profiles (id,display_name,username,bio,avatar_url,updated_at)
       values ($1,$2,$3,$4,$5,now())
       on conflict (id) do update set display_name=excluded.display_name,username=excluded.username,
       bio=excluded.bio,avatar_url=excluded.avatar_url,updated_at=now()
       returning id,display_name,username,bio,avatar_url`,
      [user.id, display_name, username, bio, avatar_url],
    );
    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: (error as { code?: string }).code === "23505" ? "Esse nome de usuário já está em uso." : "Não foi possível salvar o perfil." }, { status: 400 });
  }
}
