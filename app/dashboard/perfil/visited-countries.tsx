"use client";

import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { useEffect, useState } from "react";

type Country = { id: string; country: string };

const suggestions = COUNTRY_CODES.map(code => countryName(code)).sort((a,b) => a.localeCompare(b, "pt-BR"));

export default function VisitedCountries() {
  const [items, setItems] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/profile/visited-countries", { cache: "no-store" });
    const d = await r.json();
    if (r.ok) setItems(d.countries || []);
    else setMessage(d.error || "Não foi possível carregar.");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = country.trim();
    if (!value || saving) return;
    setSaving(true);
    setMessage("");
    const r = await fetch("/api/profile/visited-countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: value })
    });
    const d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "Não foi possível salvar.");
    } else {
      setItems(current => current.some(x => x.id === d.country.id) ? current : [...current, d.country].sort((a,b) => a.country.localeCompare(b.country)));
      setCountry("");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    const r = await fetch("/api/profile/visited-countries?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (r.ok) setItems(current => current.filter(x => x.id !== id));
  }

  return (
    <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Meu mapa</p>
        <h2 className="mt-1 text-xl font-bold">Países que visitei</h2>
        <p className="mt-1 text-sm text-neutral-500">Marque manualmente os países que você já visitou. Eles ficam registrados no seu mapa e recebem um pin.</p>
      </div>

      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          list="visited-country-suggestions"
          value={country}
          onChange={e => setCountry(e.target.value)}
          placeholder="Digite um país, ex.: Japão"
          className="min-w-0 flex-1 rounded-xl border px-3 py-2.5"
          aria-label="País visitado"
        />
        <datalist id="visited-country-suggestions">
          {suggestions.map(name => <option key={name} value={name} />)}
        </datalist>
        <button disabled={saving} className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Salvando..." : "Adicionar país"}
        </button>
      </form>

      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

      {!loading && (
        <div className="mt-5 flex flex-wrap gap-2">
          {items.length ? items.map(item => (
            <span key={item.id} className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-sm">
              {item.country}
              <button type="button" onClick={() => remove(item.id)} className="text-neutral-400 hover:text-red-600" aria-label={"Remover " + item.country}>×</button>
            </span>
          )) : <p className="text-sm text-neutral-500">Nenhum país marcado ainda.</p>}
        </div>
      )}
    </section>
  );
}
