import { createCompatClient } from "@/lib/neon/supabase-compat";

export async function createClient(shareToken?: string): Promise<any> {
  return createCompatClient(shareToken);
}
