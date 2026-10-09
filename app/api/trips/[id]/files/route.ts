import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query, transaction } from "@/lib/neon/db";
import { cleanupDeletedObjects } from "@/lib/neon/storage-cleanup";
import { privateFiles } from "@/lib/neon/storage";
import { validateFile } from "@/lib/neon/file-validation";
const tableFor = (kind: string | null) => kind === "photo" ? "trip_photos" : "trip_documents";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const table = tableFor(new URL(request.url).searchParams.get("kind"));
  const result = await query(`select id,name,mime_type,size_bytes,created_at from ${table} where trip_id=$1 order by created_at desc`, [id]);
  return NextResponse.json({ files: result.rows.map(row => ({ ...row, url: `/api/media/${row.id}` })) });
 } catch { return NextResponse.json({ error: "Não foi possível carregar os arquivos." }, { status: 500 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const user = await getCurrentUser();
 if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 let uploaded: string | undefined;
 try {
  const { id } = await params;
  if (Number(request.headers.get("content-length")) > 4.5 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande." }, { status: 413 });
  const access = await query("select app_private.trip_edit($1) as allowed", [id]);
  if (!access.rows[0]?.allowed) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file"); const photo = form.get("kind") === "photo";
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  const mime = await validateFile(file, !photo);
  const table = tableFor(photo ? "photo" : null); const fileId = crypto.randomUUID();
  const key = `${user.id}/${id}/${fileId}`;
  await privateFiles().upload(key, file, { contentType: mime }); uploaded = key;
  const result = await query(`insert into ${table}(id,trip_id,user_id,storage_path,name,mime_type,size_bytes) values($1,$2,$3,$4,$5,$6,$7) returning id,name`, [fileId,id,user.id,key,file.name.slice(0,200),mime,file.size]);
  return NextResponse.json({ file: { ...result.rows[0], url: `/api/media/${fileId}` } }, { status: 201 });
 } catch {
  if (uploaded) try { await privateFiles().delete(uploaded); } catch { console.error("file_cleanup_required"); }
  return NextResponse.json({ error: "Não foi possível salvar. Confira o formato (JPG, PNG, WebP ou PDF), tamanho (até 4 MB) e disponibilidade do armazenamento." }, { status: 400 });
 }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const user = await getCurrentUser();
 if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const url = new URL(request.url); const table = tableFor(url.searchParams.get("kind"));
  const deleted = await transaction(async client => {
   const rows = await client.query(`select id,storage_path from ${table} where id=$1 and trip_id=$2 and (user_id::text=$3 or app_private.trip_owner(trip_id)) for update`, [url.searchParams.get("fileId"),id,user.id]);
   if (!rows.rows[0]) return false;
   await client.query(`delete from ${table} where id=$1`, [rows.rows[0].id]); return true;
  });
  if (deleted) await cleanupDeletedObjects();
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
 } catch { return NextResponse.json({ error: "Não foi possível excluir o arquivo." }, { status: 500 }); }
}
