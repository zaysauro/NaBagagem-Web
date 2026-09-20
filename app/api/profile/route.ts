import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json();
  const display_name = String(body.display_name || "").trim().slice(0, 80);
  const username = String(body.username || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) || null;
  const bio = String(body.bio || "").trim().slice(0, 500);
  const avatar_url = String(body.avatar_url || "").trim() || null;
  const { data, error } = await supabase.from("profiles").upsert({ id:user.id, display_name, username, bio, avatar_url, updated_at:new Date().toISOString() }).select().single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Esse nome de usuário já está em uso." : error.message }, { status: 400 });
  return NextResponse.json({ profile:data });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:"Não autenticado." }, { status:401 });
  const [{data:profile},{data:stats}] = await Promise.all([
    supabase.from("profiles").select("display_name,username,avatar_url,bio").eq("id",user.id).maybeSingle(),
    supabase.from("travel_stats").select("is_public").eq("user_id",user.id).maybeSingle()
  ]);
  return NextResponse.json({ profile, is_public:stats?.is_public ?? true });
}
