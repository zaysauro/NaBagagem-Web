import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient() as any;

export function createClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        return authClient.signIn.email({ email, password });
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { display_name?: string } };
      }) {
        return authClient.signUp.email({
          email,
          password,
          name: options?.data?.display_name || email.split("@")[0],
        });
      },
      async signOut() {
        const result = await authClient.signOut();
        if (!result.error) { for (const storage of [localStorage, sessionStorage]) for (const key of Object.keys(storage)) if (key.startsWith("nabagagem:offline-trip:")) storage.removeItem(key); }
        return result;
      },
      async resetPasswordForEmail(email: string) {
        return authClient.requestPasswordReset({ email, redirectTo: new URL("/redefinir-senha", window.location.origin).toString() }) || {
          error: new Error("Fluxo de recuperação não configurado no Managed Better Auth."),
        };
      },
      async updateUser(..._args: any[]) {
        return {
          error: new Error("Managed Better Auth não permite alterar senha por updateUser()."),
        };
      },
    },
    // Neon PostgreSQL has no Supabase realtime channel. Poll real protected APIs.
    channel(_name?: string) {
      const listeners = new Set<() => void>();
      let timer: ReturnType<typeof setInterval> | undefined;
      return {
        on(_event: string, _filter: unknown, callback: () => void) { listeners.add(callback); return this; },
        subscribe() { if (!timer) timer = setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) listeners.forEach(callback => callback()); }, 30000); return this; },
        unsubscribe() { if (timer) clearInterval(timer); listeners.clear(); },
      };
    },
    removeChannel(channel: { unsubscribe: () => void }) { channel.unsubscribe(); },
    from(..._args: any[]) {
      throw new Error("Consultas no navegador devem passar por rotas API protegidas.");
    },
  };
}
