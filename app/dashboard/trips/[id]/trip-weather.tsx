"use client";

import { useEffect, useMemo, useState } from "react";

type Location = { id: string; name: string; city: string | null; country: string | null; latitude: number | null; longitude: number | null };
type Forecast = { date: string; min: number; max: number; rain: number; code: number };

function weatherLabel(code:number) {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code <= 48) return "Neblina";
  if (code <= 57) return "Garoa";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Pancadas";
  if (code <= 86) return "Neve forte";
  return "Trovoada";
}

export default function TripWeather({ locations }: { locations: Location[] }) {
  const points = useMemo(() => locations.filter(x => x.latitude != null && x.longitude != null).slice(0, 5), [locations]);
  const [selected, setSelected] = useState("");
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (points.length && !selected) setSelected(points[0].id); }, [points, selected]);

  useEffect(() => {
    const point = points.find(x => x.id === selected);
    if (!point) return;
    setLoading(true); setError("");
    fetch("/api/weather?latitude=" + point.latitude + "&longitude=" + point.longitude)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Erro"); return d; })
      .then(d => {
        const daily = d.daily;
        setForecast((daily?.time || []).map((date:string, i:number) => ({
          date, min: daily.temperature_2m_min[i], max: daily.temperature_2m_max[i],
          rain: daily.precipitation_probability_max?.[i] ?? 0, code: daily.weathercode[i]
        })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selected, points]);

  return (
    <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Previsão</p><h2 className="mt-1 text-xl font-bold">Clima do roteiro</h2><p className="mt-1 text-sm text-neutral-500">Previsão de até 7 dias para destinos geolocalizados.</p></div>
        {points.length > 0 && <select value={selected} onChange={e => setSelected(e.target.value)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{points.map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? " · " + p.city : ""}</option>)}</select>}
      </div>
      {points.length === 0 ? <p className="mt-5 text-sm text-neutral-500">Adicione um destino com coordenadas para consultar o clima.</p> :
       loading ? <p className="mt-5 text-sm text-neutral-500">Consultando previsão...</p> :
       error ? <p className="mt-5 text-sm text-red-600">{error}</p> :
       <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{forecast.map(day => <div key={day.date} className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs font-semibold text-neutral-500">{new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}</p><p className="mt-3 text-sm font-semibold">{weatherLabel(day.code)}</p><p className="mt-1 text-2xl font-bold">{Math.round(day.max)}° <span className="text-sm font-normal text-neutral-400">{Math.round(day.min)}°</span></p><p className="mt-2 text-xs text-neutral-500">Chuva: {day.rain}%</p></div>)}</div>}
    </section>
  );
}
