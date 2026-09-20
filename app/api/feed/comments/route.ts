import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json();
  const commentId = String(body.comment_id || "");
  const approved = Boolean(body.approved);
  if (!commentId) return NextResponse.json({ error: "Comentário inválido." }, { status: 400 });

  const { data: comment } = await supabase.from("feed_comments").select("id,post_id").eq("id", commentId).maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });

  const { data: post } = await supabase.from("feed_posts").select("user_id").eq("id", comment.post_id).maybeSingle();
  if (post?.user_id !== user.id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { error } = await supabase.from("feed_comments").update({ approved }).eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ approved });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Comentário inválido." }, { status: 400 });
  const { data: comment } = await supabase.from("feed_comments").select("id,post_id,user_id").eq("id", id).maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });
  const { data: post } = await supabase.from("feed_posts").select("user_id").eq("id", comment.post_id).maybeSingle();
  if (comment.user_id !== user.id && post?.user_id !== user.id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { error } = await supabase.from("feed_comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}