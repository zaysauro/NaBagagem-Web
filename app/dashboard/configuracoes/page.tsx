import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NotificationPreferences from "./notification-preferences";\nimport SiteHeader from "@/app/components/site-header";
import SiteHeader from "@/app/components/site-header";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <main className="p-8">Não autenticado.</main>;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 pb-8 pt-24 sm:px-6"><SiteHeader /><SiteHeader />
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-500">
          ← Dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Configurações</h1>

        <div className="mt-6 space-y-3">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="font-bold">Conta</h2>
            <p className="mt-2 text-sm text-neutral-500">{user.email}</p>
          </div>

          <Link
            href="/dashboard/perfil/editar"
            className="block rounded-3xl border bg-white p-6 shadow-sm hover:border-neutral-400"
          >
            <b>Perfil e privacidade</b>
            <p className="mt-1 text-sm text-neutral-500">
              Nome, usuário, bio, foto e visibilidade.
            </p>
          </Link>

          <NotificationPreferences />
        </div>
      </div>
    </main>
  );
}
