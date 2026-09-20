import { createBrowserClient } from "@supabase/ssr";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Configuração do Supabase ausente no build da aplicação. " +
        "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(ou NEXT_PUBLIC_SUPABASE_ANON_KEY) na Vercel e faça um novo deploy."
    );
  }

  return { url, key };
}

export function createClient() {
  const { url, key } = getSupabaseConfig();

  return createBrowserClient(url, key);
}
