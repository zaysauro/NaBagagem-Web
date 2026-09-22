import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("username")?.trim();
  if (!key) return NextResponse.json({ error: "Username obrigatório." }, { status: 400 });

  const supabase = await createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar_url,bio")
    .eq(isUuid ? "id" : "username", isUuid ? key : key.toLowerCase())
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const { data: stats } = await supabase
    .from("travel_stats")
    .select("is_public")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (stats?.is_public === false) {
    return NextResponse.json({ error: "Perfil privado." }, { status: 403 });
  }

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  let isFollowing = false;
  let followsMe = false;
  let isBlocked = false;

  if (user && user.id !== profile.id) {
    const [{ data: followingRow }, { data: followerRow }, { data: blockRow }] = await Promise.all([
      supabase.from("user_follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle(),
      supabase.from("user_follows")
        .select("follower_id")
        .eq("follower_id", profile.id)
        .eq("following_id", user.id)
        .maybeSingle(),
      supabase.from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", profile.id)
        .maybeSingle(),
    ]);

    isFollowing = !!followingRow;
    followsMe = !!followerRow;
    isBlocked = !!blockRow;
  }

  return NextResponse.json({
    profile,
    followers: followers || 0,
    following: following || 0,
    isFollowing,
    followsMe,
    isMutual: isFollowing && followsMe,
    isBlocked,
  });
}
