"use client";

import { useState } from "react";

type Location = { id: string; name: string; city: string | null; country: string | null; visited_at: string | null; notes: string | null; latitude: number | null; longitude: number | null };
type Event = { id: string; title: string; description: string | null; event_date: string | null; start_time: string | null; end_time: string | null; location_id: string | null };

export default function TripDetailClient({ tripId, initialLocations, initialEvents = [] }: { tripId: string; initialLocations: Location[]; initialEvents?: Event[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [events, setEvents] = useState(initialEvents);
  const [locationForm, setLocationForm] = useState({ name: "", city: "", country: "", visited_at: "", notes: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", event_date: "", start_time: "", end_time: "", location_id: "" });
  const [locationLoading, setLocationLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    if (response.ok) { setLocations((current) => current.filter((item) => item.id !== id)); setEvents((current) => current.map((item) => item.location_id === id ? { ...item, location_id: null } : item)); }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault(); setEventLoading(true); setMessage("");
    const response = await fetch("/api/trips/" + tripId + "/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
    const data = await response.json(); setEventLoading(false);
    if (!response.ok) { setMessage(data.error || "Não foi possível adicionar o evento."); return; }
    setEvents((current) => [...current, data.event].sort((a,b) => (a.event_date || "").localeCompare(b.event_date || "") || (a.start_time || "").localeCompare(b.start_time || "")));
    setEventForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", location_id: "" });
  }

  async function removeEvent(id: string) {
    if (!confirm("Remover este evento do itinerário?")) return;
    const response = await fetch("/api/trips/" + tripId + "/events?eventId=" + id, { method: "DELETE" });
    if (response.ok) setEvents((current) => current.filter((item) => item.id !== id));
  }

  return (
    <section className="mt-7 space-y-7">
      <div className="grid gap-7 lg:grid-cols-2">
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
                <button type="button" onClick={()=>removeLocation(item.id)} className="text-xs font-semibold text-red-600">Remover</button>
              </div>
            )}
          </div>
        </form>

        <form onSubmit={addEvent} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-950">Itinerário</h2>
          <p className="mt-1 text-sm text-neutral-500">Organize o que acontece em cada dia.</p>
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-neutral-700">Evento<input required value={eventForm.title} onChange={(e)=>setEventForm({...eventForm,title:e.target.value})} placeholder="ex.: Visitar Tokyo Skytree" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-neutral-700">Destino<select value={eventForm.location_id} onChange={(e)=>setEventForm({...eventForm,location_id:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5"><option value="">Sem destino específico</option>{locations.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="grid grid-cols-3 gap-2"><label className="text-sm font-medium text-neutral-700">Data<input type="date" value={eventForm.event_date} onChange={(e)=>setEventForm({...eventForm,event_date:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label><label className="text-sm font-medium text-neutral-700">Início<input type="time" value={eventForm.start_time} onChange={(e)=>setEventForm({...eventForm,start_time:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label><label className="text-sm font-medium text-neutral-700">Fim<input type="time" value={eventForm.end_time} onChange={(e)=>setEventForm({...eventForm,end_time:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2.5" /></label></div>
            <label className="block text-sm font-medium text-neutral-700">Descrição<textarea value={eventForm.description} onChange={(e)=>setEventForm({...eventForm,description:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
          </div>
          <button disabled={eventLoading} className="mt-4 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{eventLoading ? "Adicionando..." : "Adicionar ao itinerário"}</button>
        </form>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-neutral-950">Próximos eventos</h2>
        {events.length === 0 ? <p className="mt-4 text-sm text-neutral-500">Nenhum evento cadastrado ainda.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{events.map((item)=><div key={item.id} className="rounded-2xl bg-neutral-50 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-neutral-950">{item.title}</p><p className="mt-1 text-xs text-neutral-500">{item.event_date || "Data não definida"}{item.start_time ? " · " + item.start_time : ""}{item.end_time ? "–" + item.end_time : ""}</p></div><button onClick={()=>removeEvent(item.id)} className="text-xs font-semibold text-red-600">Remover</button></div>{item.location_id && <p className="mt-2 text-xs text-neutral-600">Destino: {locations.find((l)=>l.id===item.location_id)?.name || "Destino removido"}</p>}{item.description && <p className="mt-2 text-sm text-neutral-600">{item.description}</p>}</div>)}</div>}
      </div>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
    </section>
  );
}