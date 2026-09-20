import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const postId = String(form.get("post_id") || "").trim();
  const file = form.get("file");
  if (!postId || !(file instanceof File)) return NextResponse.json({ error: "Post e imagem são obrigatórios." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 8 MB." }, { status: 400 });

  const { data: post } = await supabase.from("feed_posts").select("id").eq("id", postId).eq("user_id", user.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${postId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data: publicData } = supabase.storage.from("feed-media").getPublicUrl(path);
  const { data, error } = await supabase.from("feed_post_media").insert({
    post_id: postId, user_id: user.id, storage_path: path, public_url: publicData.publicUrl
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ media: data }, { status: 201 });
}
