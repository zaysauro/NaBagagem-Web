import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

export function privateFiles() {
  if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new Error("Armazenamento indisponível.");
  return new Files({ adapter: neon({ bucket: process.env.NEON_STORAGE_BUCKET || "uploads" }) });
}
export const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string, file: File, options?: { contentType?: string; upsert?: boolean }) {
        try { await privateFiles().upload(path, file, { contentType: options?.contentType || file.type }); return { data: { path }, error: null }; }
        catch { return { data: null, error: new Error("Não foi possível salvar o arquivo.") }; }
      },
      async remove(paths: string[]) {
        try { await Promise.all(paths.map(path => privateFiles().delete(path))); return { data: paths.map(name => ({ name })), error: null }; }
        catch { return { data: null, error: new Error("Não foi possível excluir o arquivo.") }; }
      },
    };
  },
};
