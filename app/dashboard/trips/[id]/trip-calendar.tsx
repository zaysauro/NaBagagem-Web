"use client";

import { useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  day_index: number;
  color: string;
  location_name?: string | null;
};

export default function TripCalendar({ events = [], startDate, endDate }: { events?: CalendarEvent[]; startDate?: string | null; endDate?: string | null }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const days = useMemo(() => {
    const result: { index: number; date: string | null; events: CalendarEvent[] }[] = [];
    const start = startDate ? new Date(startDate + "T12:00:00") : null;
    const end = endDate ? new Date(endDate + "T12:00:00") : null;
    const max = start && end ? Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1) : Math.max(1, ...events.map(e => e.day_index || 1));
    for (let i = 1; i <= Math.min(max, 60); i++) {
      const date = start ? new Date(start.getTime() + (i - 1) * 86400000).toISOString().slice(0, 10) : null;
      result.push({ index: i, date, events: [] });
    }
    for (const event of events) {
      let day = result.find(d => d.index === event.day_index);
      if (!day) { day = { index: event.day_index, date: event.event_date, events: [] }; result.push(day); }
      day.events.push(event);
    }
    return result.sort((a,b) => a.index - b.index).map(day => ({ ...day, events: [...day.events].sort((a,b) => (a.start_time || "99:99").localeCompare(b.start_time || "99:99")) }));
  }, [events, startDate, endDate]);

  const visible = selectedDay === 0 ? days : days.filter(d => d.index === selectedDay);
  const formatDate = (date: string | null) => date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short" }) : "Data não definida";

  return <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Agenda</p><h2 className="mt-1 text-xl font-bold text-neutral-950">Calendário da viagem</h2><p className="mt-1 text-sm text-neutral-500">Uma visão cronológica de tudo que está planejado.</p></div>
      <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSelectedDay(0)} className={"rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap "+(selectedDay===0?"bg-neutral-950 text-white":"bg-neutral-100 text-neutral-600")}>Todos</button>
        {days.map(d => <button key={d.index} type="button" onClick={() => setSelectedDay(d.index)} className={"rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap "+(selectedDay===d.index?"bg-neutral-950 text-white":"bg-neutral-100 text-neutral-600")}>Dia {d.index}</button>)}
      </div>
    </div>
    <div className="mt-6 space-y-6">
      {visible.map(day => <div key={day.index}>
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white">{day.index}</div><div><h3 className="font-bold">Dia {day.index}</h3><p className="text-xs capitalize text-neutral-500">{formatDate(day.date)}</p></div><span className="ml-auto text-xs text-neutral-400">{day.events.length} atividade{day.events.length===1?"":"s"}</span></div>
        {day.events.length === 0 ? <p className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-400">Nenhuma atividade planejada.</p> :
          <div className="relative mt-3 ml-4 border-l-2 border-neutral-200 pl-5 space-y-3">
            {day.events.map(event => <div key={event.id} className="relative rounded-2xl border bg-neutral-50 p-4" style={{ borderLeftWidth:4, borderLeftColor: event.color }}>
              <div className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-white bg-neutral-950"/>
              <div className="flex gap-3"><div className="w-16 shrink-0 text-xs font-bold text-neutral-500">{event.start_time?.slice(0,5) || "—"}{event.end_time ? " · "+event.end_time.slice(0,5) : ""}</div><div><p className="font-semibold">{event.title}</p>{event.location_name && <p className="mt-1 text-xs text-neutral-500">{event.location_name}</p>}</div></div>
            </div>)}
          </div>}
      </div>)}
    </div>
  </section>;
}
