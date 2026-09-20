"use client";

import { useEffect, useState } from "react";

type Preferences = {
  trip_reminders: boolean;
  reservation_reminders: boolean;
  social_notifications: boolean;
  weather_alerts: boolean;
  system_notifications: boolean;
};

const labels: Array<[keyof Preferences, string, string]> = [
  ["trip_reminders", "Lembretes de viagens", "Avisos sobre viagens que estão próximas do início."],
  ["reservation_reminders", "Lembretes de reservas", "Avisos de atividades e reservas antes do horário marcado."],
  ["social_notifications", "Atividade social", "Curtidas, comentários e novos seguidores."],
  ["weather_alerts", "Alertas meteorológicos", "Avisos relacionados ao clima durante suas viagens."],
  ["system_notifications", "Notificações do sistema", "Informações importantes sobre sua conta e o funcionamento do serviço."]
];

const initial: Preferences = {
  trip_reminders: true,
  reservation_reminders: true,
  social_notifications: true,
  weather_alerts: true,
  system_notifications: true
};

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof Preferences | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar as preferências.");
        setPreferences(data.preferences);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof Preferences) => {
    const value = !preferences[key];
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaving(key);
    setError("");

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");

      setPreferences(data.preferences);
    } catch (err) {
      setPreferences((current) => ({ ...current, [key]: !value }));
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="mt-3 rounded-3xl border bg-white p-6 text-sm text-neutral-500">Carregando preferências...</div>;
  }

  return (
    <div className="mt-3 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold">Preferências de notificações</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Escolha quais tipos de aviso você quer receber.
        </p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="divide-y">
        {labels.map(([key, title, description]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-xs text-neutral-500">{description}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={preferences[key]}
              disabled={saving === key}
              onClick={() => toggle(key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${preferences[key] ? "bg-neutral-950" : "bg-neutral-200"} ${saving === key ? "opacity-60" : ""}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${preferences[key] ? "left-6" : "left-1"}`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
