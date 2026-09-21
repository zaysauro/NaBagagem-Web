"use client";

import { useEffect, useMemo, useState } from "react";

type Reservation = {
  id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reservation_name: string | null;
  confirmation_code: string | null;
  reservation_url: string | null;
  reminder_minutes: number | null;
  day_index: number;
};

export default function TripReservations({ tripId }: { tripId: string }) {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/trips/" + tripId + "/events", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setItems((data.events || []).filter((event: Reservation) => event.reservation_name || event.confirmation_code || event.reservation_url));
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [tripId]);

  const sorted = useMemo(() => [...items].sort((a,b) =>
    a.day_index - b.day_index ||
    (a.event_date || "").localeCompare(b.event_date || "") ||
    (a.start_time || "").localeCompare(b.start_time || "")
  ), [items]);

  return (
    <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-950">Reservas</h2>
          <p className="mt-1 text-sm text-neutral-500">Hotéis, voos, restaurantes, ingressos e outras reservas vinculadas ao roteiro.</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">{items.length} {items.length === 1 ? "reserva" : "reservas"}</span>
      </div>

      {loading ? <p className="mt-5 text-sm text-neutral-500">Carregando reservas...</p> :
        sorted.length === 0 ? <p className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">Nenhuma reserva cadastrada. Ao criar uma atividade, preencha os dados de reserva para ela aparecer aqui.</p> :
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {sorted.map((item) => (
            <article key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Dia {item.day_index}</p>
                  <h3 className="mt-1 font-bold text-neutral-950">{item.reservation_name || item.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.event_date || "Data não definida"}
                    {item.start_time ? " · " + item.start_time : ""}
                    {item.end_time ? "–" + item.end_time : ""}
                  </p>
                </div>
                {item.reminder_minutes != null && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600">{item.reminder_minutes} min antes</span>}
              </div>
              {item.confirmation_code && <div className="mt-3 rounded-xl bg-white p-3"><p className="text-[11px] uppercase tracking-wider text-neutral-400">Código</p><p className="mt-1 font-mono font-semibold text-neutral-900">{item.confirmation_code}</p></div>}
              {item.reservation_url && <a href={item.reservation_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Abrir reserva</a>}
            </article>
          ))}
        </div>}
    </section>
  );
}
