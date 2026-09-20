import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "Username obrigatório." }, { status: 400 });

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles")
    .select("id,display_name,username,avatar_url,bio").eq("username", username).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const { data: stats } = await supabase.from("travel_stats").select("is_public")
    .eq("user_id", profile.id).maybeSingle();
  if (stats?.is_public === false) return NextResponse.json({ error: "Perfil privado." }, { status: 403 });

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const { data: { user } } = await supabase.auth.getUser();
  let isFollowing = false, isBlocked = false;
  if (user) {
    const [{ data: f }, { data: b }] = await Promise.all([
      supabase.from("user_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle(),
      supabase.from("user_blocks").select("blocker_id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle()
    ]);
    isFollowing = !!f; isBlocked = !!b;
  }
  return NextResponse.json({ profile, followers: followers || 0, following: following || 0, isFollowing, isBlocked });
}