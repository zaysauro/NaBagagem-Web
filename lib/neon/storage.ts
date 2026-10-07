import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

const DEFAULT_BUCKET = process.env.NEON_STORAGE_BUCKET || "uploads";

function files(bucket = DEFAULT_BUCKET) {
  return new Files({ adapter: neon({ bucket }) });
}

export const storage = {
  from(bucket: string) {
    const bucketName = bucket === "feed-media" ? DEFAULT_BUCKET : bucket;
    const client = files(bucketName);

    return {
      async upload(path: string, file: File, options?: { contentType?: string; upsert?: boolean }) {
        try {
          if (!options?.upsert && await client.exists(path)) {
            return { data: null, error: new Error("Arquivo já existe.") };
          }

          await client.upload(path, file, { contentType: options?.contentType || file.type });
          return { data: { path }, error: null };
        } catch (error) {
          return { data: null, error: normalizeError(error) };
        }
      },
      getPublicUrl(path: string) {
        const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "");
        return {
          data: {
            publicUrl: endpoint ? `${endpoint}/${bucketName}/${path}` : path,
          },
        };
      },
      async remove(paths: string[]) {
        try {
          await Promise.all(paths.map((path) => client.delete(path)));
          return { data: paths.map((path) => ({ name: path })), error: null };
        } catch (error) {
          return { data: null, error: normalizeError(error) };
        }
      },
    };
  },
};

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
