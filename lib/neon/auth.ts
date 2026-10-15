import { createNeonAuth } from "@neondatabase/auth/next/server";

export type AppUser = {
  id: string;
  email?: string | null;
  user_metadata?: { display_name?: string; name?: string };
};

let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("Serviço de autenticação indisponível.");
  if (!instance) instance = createNeonAuth({ baseUrl, cookies: { secret } });
  return instance;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) return null;
  const { data } = await getAuth().getSession();
  const sessionData = data as any;
  const user = sessionData?.session?.user || sessionData?.user;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      display_name: user.name || user.email?.split("@")[0],
      name: user.name,
    },
  };
}
