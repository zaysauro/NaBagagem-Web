"use client";

import { useState } from "react";

type Location = {
  id: string; name: string; city: string | null; country: string | null;
  visited_at: string | null; notes: string | null;
};

export default function TripDetailClient({ tripId, initialLocations }: { tripId: string; initialLocations: Location[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [form, setForm] = useState({ name: "", city: "", country: "", visited_at: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function addLocation(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/trips/" + tripId + "/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(data.error || "Não foi possível adicionar o destino."); return; }
    setLocations((current) => [...current, data.location]);
    setForm({ name: "", city: "", country: "", visited_at: "", notes: "" });
  }

  async function removeLocation(id: string) {
    if (!confirm("Remover este destino da viagem?")) return;
    const response = await fetch("/api/trips/" + tripId + "/locations?locationId=" + id, { method: "DELETE" });
    if (response.ok) setLocations((current) => current.filter((item) => item.id !== id));
  }

  return (
    <section className="mt-7 grid gap-7 lg:grid-cols-[1fr_1.35fr]">
      <form onSubmit={addLocation} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-neutral-950">Adicionar destino</h2>
        <p className="mt-1 text-sm text-neutral-500">Comece a montar o mapa da sua viagem.</p>
        <div className="mt-5 space-y-3">
          {([["name","Nome do lugar","ex.: Tokyo"],["city","Cidade","ex.: Tóquio"],["country","País","ex.: Japão"]] as const).map(([key,label,placeholder]) => (
            <label key={key} className="block text-sm font-medium text-neutral-700">{label}<input required={key==="name"} value={form[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-950" /></label>
          ))}
          <label className="block text-sm font-medium text-neutral-700">Data da visita<input type="date" value={form.visited_at} onChange={(e)=>setForm({...form,visited_at:e.target.value})} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-neutral-700">Observações<textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></label>
        </div>
        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        <button disabled={loading} className="mt-5 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Adicionando..." : "Adicionar destino"}</button>
      </form>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-neutral-950">Destinos</h2>
        {locations.length === 0 ? <p className="mt-4 text-sm text-neutral-500">Nenhum destino cadastrado ainda.</p> : <div className="mt-5 space-y-3">{locations.map((location, index) => <div key={location.id} className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 p-4"><div><p className="font-bold text-neutral-950">{index + 1}. {location.name}</p><p className="mt-1 text-sm text-neutral-600">{[location.city, location.country].filter(Boolean).join(", ") || "Localização não informada"}</p>{location.visited_at && <p className="mt-1 text-xs text-neutral-400">Visita: {location.visited_at}</p>}{location.notes && <p className="mt-2 text-sm text-neutral-600">{location.notes}</p>}</div><button onClick={()=>removeLocation(location.id)} className="text-xs font-semibold text-red-600">Remover</button></div>)}</div>}
      </div>
    </section>
  );
}