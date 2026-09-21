import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase();
  const type = new URL(request.url).searchParams.get("type") === "following" ? "following" : "followers";
  if (!username) return NextResponse.json({ error: "Username obrigatório." }, { status: 400 });

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("username", username).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const column = type === "followers" ? "follower_id" : "following_id";
  const relation = type === "followers" ? "following_id" : "follower_id";
  const { data, error } = await supabase.from("user_follows")
    .select(`${column},profiles:${relation}(id,username,display_name,avatar_url)`)
    .eq(relation, profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    type,
    profile,
    users: (data || []).map((row: any) => row.profiles).filter(Boolean)
  });
}
