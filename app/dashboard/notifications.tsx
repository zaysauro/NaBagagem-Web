"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
      ].join("-");

      const localTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

      await fetch("/api/notifications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate, localTime })
      });

      const r = await fetch("/api/notifications");
      const d = await r.json();

      if (!r.ok) throw new Error(d.error);

      setItems(d.notifications || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  };

  useEffect(() => {
    load();

    const env =
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!env) return;

    const sb = createClient();

    const ch = sb
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load()
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  const unread = items.filter((x) => !x.read_at).length;

  const mark = async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {})
    });

    const timestamp = new Date().toISOString();

    setItems((xs) =>
      id
        ? xs.map((x) => (x.id === id ? { ...x, read_at: timestamp } : x))
        : xs.map((x) => ({ ...x, read_at: timestamp }))
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border bg-white px-3 py-2 text-sm font-semibold"
      >
        Notificações{" "}
        {unread > 0 && (
          <span className="ml-1 rounded-full bg-neutral-950 px-1.5 py-0.5 text-xs text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <strong>Notificações</strong>
            <button onClick={() => mark()} className="text-xs text-neutral-500">
              Marcar todas
            </button>
          </div>

          {error ? (
            <p className="p-3 text-xs text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-center text-sm text-neutral-500">
              Tudo tranquilo por aqui.
            </p>
          ) : (
            <div className="max-h-96 overflow-auto">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={async () => {
                    await mark(n.id);
                    if (n.href) window.location.href = n.href;
                  }}
                  className={`block w-full rounded-xl p-3 text-left ${n.read_at ? "" : "bg-neutral-50"}`}
                >
                  <p className="text-sm font-semibold">{n.title}</p>

                  {n.body && (
                    <p className="mt-1 text-xs text-neutral-500">{n.body}</p>
                  )}

                  <p className="mt-1 text-[10px] text-neutral-400">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
