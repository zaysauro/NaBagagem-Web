"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Location = { id: string; name: string; city: string | null; country: string | null; visited_at: string | null; notes: string | null; latitude: number | null; longitude: number | null };
type Status = "completed" | "in_progress" | "future";
type Event = { id: string; title: string; description: string | null; event_date: string | null; start_time: string | null; end_time: string | null; location_id: string | null; day_index: number; status: Status; color: string; reservation_name: string | null; confirmation_code: string | null; reservation_url: string | null; reminder_minutes: number | null };

const statusLabel: Record<Status, string> = { completed: "Concluído", in_progress: "Em andamento", future: "Planejado" };

export default function TripDetailClient({ tripId, initialLocations, initialEvents = [], canEdit = true }: { tripId: string; initialLocations: Location[]; initialEvents?: Event[]; canEdit?: boolean }) {
  const [locations, setLocations] = useState(initialLocations);
  const [events, setEvents] = useState(initialEvents);
  const [locationForm, setLocationForm] = useState({ name: "", city: "", country: "", visited_at: "", notes: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", event_date: "", start_time: "", end_time: "", location_id: "", day_index: "1", status: "future" as Status, color: "#111827", reservation_name: "", confirmation_code: "", reservation_url: "", reminder_minutes: "" });
  const [locationLoading, setLocationLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient> | null = null;

    async function refreshFromServer() {
      try {
        const response = await fetch("/api/trips/" + tripId, { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json();
        if (active) {
          setLocations(data.locations || []);
          setEvents(data.events || []);
        }
      } catch {}
    }

    try {
      supabase = createClient();
      const channel = supabase
        .channel("trip-collaboration-" + tripId)
        .on("postgres_changes", { event: "*", schema: "public", table: "trip_locations", filter: "trip_id=eq." + tripId }, refreshFromServer)
        .on("postgres_changes", { event: "*", schema: "public", table: "trip_events", filter: "trip_id=eq." + tripId }, refreshFromServer)
        .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: "id=eq." + tripId }, refreshFromServer)
        .subscribe();

      return () => {
        active = false;
        if (supabase) supabase.removeChannel(channel);
      };
    } catch {
      return () => { active = false; };
    }
  }, [tripId]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<number, Event[]>();
    [...events].sort((a,b) => a.day_index - b.day_index || (a.event_date || "").localeCompare(b.event_date || "") || (a.start_time || "").localeCompare(b.start_time || "")).forEach((event) => {
      const list = groups.get(event.day_index) || [];
      list.push(event);
      groups.set(event.day_index, list);
    });
    return [...groups.entries()];
  }, [events]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault(); setLocationLoading(true); setMessage("");
    const response = await fetch("/api/trips/" + tripId + "/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(locationForm) });
    const data = await response.json(); setLocationLoading(false);
    if (!response.ok) { setMessage(data.error || "Não foi possível adicionar o destino."); return; }
    setLocations((current) => [...current, data.location]);
    setLocationForm({ name: "", city: "", country: "", visited_at: "", notes: "" });
    setMessage(data.location.latitude != null ? "Destino adicionado e localizado no mapa." : "Destino adicionado, mas não foi possível localizar no mapa.");
  }

  async function removeLocation(id: string) {
    if (!confirm("Remover este destino da viagem?")) return;
    const response = await fetch("/api/trips/" + tripId + "/locations?locationId=" + id, { method: "DELETE" });
    if (response.ok) {
      setLocations((current) => current.filter((item) => item.id !== id));
      setEvents((current) => current.map((item) => item.location_id === id ? { ...item, location_id: null } : item));
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault(); setEventLoading(true); setMessage("");
    const response = await fetch("/api/trips/" + tripId + "/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
    const data = await response.json(); setEventLoading(false);
    if (!response.ok) { setMessage(data.error || "Não foi possível adicionar a atividade."); return; }
    setEvents((current) => [...current, data.event]);
    setEventForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", location_id: "", day_index: "1", status: "future", color: "#111827", reservation_name: "", confirmation_code: "", reservation_url: "", reminder_minutes: "" });
    setMessage("Atividade adicionada ao itinerário.");
  }

  async function updateEvent(id: string, patch: Partial<Event>) {
    const response = await fetch("/api/trips/" + tripId + "/events?eventId=" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Não foi possível atualizar a atividade."); return; }
    setEvents((current) => current.map((item) => item.id === id ? data.event : item));
  }

  async function removeEvent(id: string) {
    if (!confirm("Remover esta atividade do itinerário?")) return;
    const response = await fetch("/api/trips/" + tripId + "/events?eventId=" + id, { method: "DELETE" });
    if (response.ok) setEvents((current) => current.filter((item) => item.id !== id));
  }

  return (
    <section className="mt-7 space-y-7">
      {!canEdit && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Você está como visualizador. As alterações desta viagem estão bloqueadas para sua conta.</div>}
      {canEdit && <div className="grid gap-7 lg:grid-cols-2">
        <form onSubmit={addLocation} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-950">Destinos</h2>
          <p className="mt-1 text-sm text-neutral-500">Ao salvar, o NaBagagem tenta localizar automaticamente o ponto no mapa.</p>
          <div className="mt-5 space-y-3">
            {([["name","Nome do lugar","ex.: Tokyo Skytree"],["city","Cidade","ex.: Tóquio"],["country","País","ex.: Japão"]] as const).map(([key,label,placeholder]) =>
              <label key={key} className="block text-sm font-medium text-neutral-700">{label}
                <input required={key==="name"} value={locationForm[key]} onChange={(e)=>setLocationForm({...locationForm,[key]:e.target.value})} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-950" />
              </label>
            )}
            <label className="block text-sm font-medium text-neutral-700">Data da visita<input type="date" value={locationForm.visited_at} onChange={(e)=>setLocationForm({...locationForm,visited_at:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-neutral-700">Observações<textarea value={locationForm.notes} onChange={(e)=>setLocationForm({...locationForm,notes:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
          </div>
          <button disabled={locationLoading} className="mt-4 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{locationLoading ? "Localizando e salvando..." : "Adicionar destino"}</button>
          <div className="mt-5 space-y-2">
            {locations.map((item,index)=>
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
                <div><b>{index+1}. {item.name}</b><p className="text-xs text-neutral-500">{[item.city,item.country].filter(Boolean).join(", ")}</p><p className="mt-1 text-[11px] text-neutral-400">{item.latitude != null ? "Localizado no mapa" : "Sem coordenadas"}</p></div>
                {canEdit && <button type="button" onClick={()=>removeLocation(item.id)} className="text-xs font-semibold text-red-600">Remover</button>}
              </div>
            )}
          </div>
        </form>

        <form onSubmit={addEvent} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-950">Itinerário</h2>
          <p className="mt-1 text-sm text-neutral-500">Crie várias atividades por dia e acompanhe o estado de cada uma.</p>
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-neutral-700">Atividade<input required value={eventForm.title} onChange={(e)=>setEventForm({...eventForm,title:e.target.value})} placeholder="ex.: Visitar Tokyo Skytree" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-neutral-700">Destino<select value={eventForm.location_id} onChange={(e)=>setEventForm({...eventForm,location_id:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5"><option value="">Sem destino específico</option>{locations.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-medium text-neutral-700">Dia<input type="number" min="1" value={eventForm.day_index} onChange={(e)=>setEventForm({...eventForm,day_index:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label>
              <label className="text-sm font-medium text-neutral-700">Status<select value={eventForm.status} onChange={(e)=>setEventForm({...eventForm,status:e.target.value as Status})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5">{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2"><label className="text-sm font-medium text-neutral-700">Data<input type="date" value={eventForm.event_date} onChange={(e)=>setEventForm({...eventForm,event_date:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label><label className="text-sm font-medium text-neutral-700">Cor<input type="color" value={eventForm.color} onChange={(e)=>setEventForm({...eventForm,color:e.target.value})} className="mt-1 h-10 w-14 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" /></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-sm font-medium text-neutral-700">Início<input type="time" value={eventForm.start_time} onChange={(e)=>setEventForm({...eventForm,start_time:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label><label className="text-sm font-medium text-neutral-700">Fim<input type="time" value={eventForm.end_time} onChange={(e)=>setEventForm({...eventForm,end_time:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label></div>
            <label className="block text-sm font-medium text-neutral-700">Reserva (opcional)<input value={eventForm.reservation_name} onChange={(e)=>setEventForm({...eventForm,reservation_name:e.target.value})} placeholder="ex.: Hotel, restaurante, voo..." className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>\n            <div className="grid grid-cols-2 gap-2"><label className="text-sm font-medium text-neutral-700">Código<input value={eventForm.confirmation_code} onChange={(e)=>setEventForm({...eventForm,confirmation_code:e.target.value})} placeholder="ex.: ABC123" className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label><label className="text-sm font-medium text-neutral-700">Lembrete<input type="number" min="0" max="10080" value={eventForm.reminder_minutes} onChange={(e)=>setEventForm({...eventForm,reminder_minutes:e.target.value})} placeholder="minutos" className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label></div>\n            <label className="block text-sm font-medium text-neutral-700">Link da reserva<input type="url" value={eventForm.reservation_url} onChange={(e)=>setEventForm({...eventForm,reservation_url:e.target.value})} placeholder="https://..." className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>\n            <label className="block text-sm font-medium text-neutral-700">Descrição<textarea value={eventForm.description} onChange={(e)=>setEventForm({...eventForm,description:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
          </div>
          <button disabled={eventLoading} className="mt-4 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{eventLoading ? "Adicionando..." : "Adicionar atividade"}</button>
        </form>
      </div>}

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-neutral-950">Roteiro por dia</h2>
        {groupedEvents.length === 0 ? <p className="mt-4 text-sm text-neutral-500">Nenhuma atividade cadastrada ainda.</p> : <div className="mt-5 space-y-6">{groupedEvents.map(([day, dayEvents])=><div key={day}><div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white">{day}</div><h3 className="font-bold text-neutral-950">Dia {day}</h3><span className="text-xs text-neutral-400">{dayEvents.length} atividade{dayEvents.length === 1 ? "" : "s"}</span></div><div className="grid gap-3 md:grid-cols-2">{dayEvents.map((item)=><div key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4" style={{ borderLeftWidth: 5, borderLeftColor: item.color }}><div className="flex justify-between gap-3"><div><p className="font-bold text-neutral-950">{item.title}</p><p className="mt-1 text-xs text-neutral-500">{item.event_date || "Data não definida"}{item.start_time ? " · " + item.start_time : ""}{item.end_time ? "–" + item.end_time : ""}</p></div>{canEdit && <button onClick={()=>removeEvent(item.id)} className="text-xs font-semibold text-red-600">Remover</button>}</div><div className="mt-3 flex flex-wrap gap-2">{canEdit && <><select value={item.status} onChange={(e)=>updateEvent(item.id,{status:e.target.value as Status})} className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs">{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input aria-label="Cor da atividade" type="color" value={item.color} onChange={(e)=>updateEvent(item.id,{color:e.target.value})} className="h-8 w-10 cursor-pointer rounded-md border border-neutral-300 bg-white p-1" /></>}</div>{item.location_id && <p className="mt-2 text-xs text-neutral-600">Destino: {locations.find((l)=>l.id===item.location_id)?.name || "Destino removido"}</p>}{item.reservation_name && <div className="mt-3 rounded-xl bg-white p-3 text-xs"><p className="font-semibold">Reserva: {item.reservation_name}</p>{item.confirmation_code&&<p className="mt-1 text-neutral-500">Código: {item.confirmation_code}</p>}{item.reminder_minutes!=null&&<p className="mt-1 text-neutral-500">Lembrete: {item.reminder_minutes} min antes</p>}{item.reservation_url&&<a href={item.reservation_url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold underline">Abrir reserva</a>}</div>}{item.description && <p className="mt-2 text-sm text-neutral-600">{item.description}</p>}</div>)}</div></div>)}</div>}
      </div>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
    </section>
  );
}
