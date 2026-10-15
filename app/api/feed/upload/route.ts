import { query, transaction } from "@/lib/neon/db";
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
  const allowed = new Set(["image/jpeg","image/png","image/webp"]);
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG ou WebP." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 4 MB." }, { status: 400 });

  const { count, error: countError } = await supabase.from("feed_post_media").select("id", { count: "exact", head: true }).eq("post_id", postId);
  if (countError) return NextResponse.json({ error: "Não foi possível verificar as fotos." }, { status: 503 });
  if ((count || 0) >= 5) return NextResponse.json({ error: "Cada publicação pode ter no máximo 5 fotos." }, { status: 400 });

  const { data: post } = await supabase.from("feed_posts").select("id").eq("id", postId).eq("user_id", user.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });

  try { await validateFile(file); } catch { return NextResponse.json({ error: "Imagem inválida. Use JPG, PNG ou WebP." }, { status: 400 }); }
  const mediaId = crypto.randomUUID();
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] || "jpg";
  const path = `${user.id}/${postId}/${crypto.randomUUID()}.${extension}`;
  let reservation: string;
  try {
    reservation = (await query("select app_private.reserve_upload($1) as id", [path])).rows[0].id;
  } catch { return NextResponse.json({ error: "Não foi possível preparar o envio." }, { status: 503 }); }
  const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    // Keep reservation: the provider may have accepted the object before timing out.
    return NextResponse.json({ error: "Não foi possível salvar a imagem no armazenamento.", stage: "storage_upload" }, { status: 503 });
  }
  try {
    const media = await transaction(async client => {
      const result = await client.query(`insert into feed_post_media
        (id,post_id,user_id,storage_path,public_url,mime_type,size_bytes)
        values($1,$2,$3,$4,$5,$6,$7) returning *`,
        [mediaId,postId,user.id,path,`/api/media/${mediaId}`,file.type,file.size]);
      await client.query("select app_private.complete_storage_deletion($1)", [reservation]);
      return result.rows[0];
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch {
    const { error: cleanupError } = await supabase.storage.from("feed-media").remove([path]);
    if (!cleanupError) await query("select app_private.complete_storage_deletion($1)", [reservation]).catch(() => {});
    return NextResponse.json({ error: "Não foi possível associar a foto. Verifique o limite de cinco fotos e tente novamente.", stage: "media_insert" }, { status: 400 });
  }
}
