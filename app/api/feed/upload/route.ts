import { validateFile } from "@/lib/neon/file-validation";
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
  const allowed = new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG ou WebP." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 4 MB." }, { status: 400 });

  const { count } = await supabase.from("feed_post_media").select("id", { count: "exact", head: true }).eq("post_id", postId);
  if ((count || 0) >= 5) return NextResponse.json({ error: "Cada publicação pode ter no máximo 5 fotos." }, { status: 400 });

  const { data: post } = await supabase.from("feed_posts").select("id").eq("id", postId).eq("user_id", user.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });

  try { await validateFile(file); } catch { return NextResponse.json({ error: "Imagem inválida. Use JPG, PNG ou WebP." }, { status: 400 }); }
  const mediaId = crypto.randomUUID();
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] || "jpg";
  const path = `${user.id}/${postId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({
      error: "Não foi possível salvar a imagem no armazenamento.",
      stage: "storage_upload"
    }, { status: 400 });
  }


  const { data, error } = await supabase.from("feed_post_media").insert({
    id: mediaId, post_id: postId, user_id: user.id, storage_path: path, public_url: `/api/media/${mediaId}`, mime_type: file.type, size_bytes: file.size
  }).select().single();
  if (error) {
    await supabase.storage.from("feed-media").remove([path]);
    return NextResponse.json({
      error: "A foto foi enviada, mas não conseguimos registrar a mídia da publicação.",
      stage: "media_insert"
    }, { status: 400 });
  }

  return NextResponse.json({ media: data }, { status: 201 });
}
