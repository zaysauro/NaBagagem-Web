import { NextResponse } from "next/server";
import { query } from "@/lib/neon/db";
import { privateFiles } from "@/lib/neon/storage";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  // RLS restricts private trip files to members and social photos to visible posts.
  const result = await query("select storage_path from trip_documents where id=$1 union all select storage_path from trip_photos where id=$1 union all select storage_path from feed_post_media where id=$1", [id]);
  if (!result.rows[0]) return new NextResponse(null, { status: 404 });
  const url = await privateFiles().url(result.rows[0].storage_path, { expiresIn: 60 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
 } catch { return NextResponse.json({ error: "Arquivo indisponível." }, { status: 503 }); }
}
