import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const target = String(body.user_id || "").trim();
  const action = body.action === "unblock" ? "unblock" : "block";
  if (!target || target === user.id) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });

  if (action === "block") {
    await supabase.from("user_follows").delete().or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);
    const { error } = await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: target }, { onConflict: "blocker_id,blocked_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", target);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, blocked: action === "block" });
}
