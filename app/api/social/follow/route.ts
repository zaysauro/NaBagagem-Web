import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const target = String(body.user_id || "").trim();
  const action = body.action === "unfollow" ? "unfollow" : "follow";
  if (!target || target === user.id) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });

  if (action === "follow") {
    const { error } = await supabase.from("user_follows").upsert({ follower_id: user.id, following_id: target }, { onConflict: "follower_id,following_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", target);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, following: action === "follow" });
}
