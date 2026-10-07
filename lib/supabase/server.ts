import { createCompatClient } from "@/lib/neon/supabase-compat";

export async function createClient(): Promise<any> {
  return createCompatClient();
}
