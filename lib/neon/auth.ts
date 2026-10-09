import { createNeonAuth } from "@neondatabase/auth/next/server";

export type AppUser = {
  id: string;
  email?: string | null;
  user_metadata?: { display_name?: string; name?: string };
};

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://auth.local.invalid",
  cookies: {
    secret:
      process.env.NEON_AUTH_COOKIE_SECRET ||
      "build-time-placeholder-cookie-secret-change-in-production",
  },
});

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) return null;
  const { data } = await auth.getSession();
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
