import { isStorageCronAuthorized, runStorageCleanup } from "@/lib/neon/storage-cleanup";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    console.error("storage_cleanup_unconfigured");
    return Response.json({ error: "Limpeza indisponível." }, { status: 503, headers });
  }
  if (!isStorageCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Não autorizado." }, { status: 401, headers });
  }
  try {
    const result = await runStorageCleanup();
    if (result.failed) console.error("storage_cleanup_retry_pending", { count: result.failed });
    return Response.json({ ok: result.failed === 0, ...result }, { status: result.failed ? 503 : 200, headers });
  } catch {
    console.error("storage_cleanup_failed");
    return Response.json({ error: "Não foi possível concluir a limpeza." }, { status: 503, headers });
  }
}
