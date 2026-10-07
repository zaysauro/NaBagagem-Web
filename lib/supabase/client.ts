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
        return authClient.signOut();
      },
      async resetPasswordForEmail(email: string) {
        return authClient.forgetPassword?.({ email }) || {
          error: new Error("Fluxo de recuperação não configurado no Managed Better Auth."),
        };
      },
      async updateUser(..._args: any[]) {
        return {
          error: new Error("Managed Better Auth não permite alterar senha por updateUser()."),
        };
      },
    },
    channel(_name?: string) {
      return {
        on(..._args: any[]) {
          return this;
        },
        subscribe(..._args: any[]) {
          return this;
        },
      };
    },
    removeChannel(..._args: any[]) {},
    from(..._args: any[]) {
      throw new Error("Consultas no navegador devem passar por rotas API protegidas.");
    },
  };
}
