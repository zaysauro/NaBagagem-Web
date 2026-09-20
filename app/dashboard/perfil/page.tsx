"use client";

import { useEffect, useState } from "react";

type Data = {
  profile: { display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null } | null;
  stats: { trips: number; countries: number; cities: number; kilometers: number; countriesList: string[] };
  badges: string[];
};

const badgeNames: Record<string,string> = {
  first_trip: "Primeira viagem",
  three_countries: "3 países",
  ten_countries: "10 países",
  "1000_km": "1.000 km viajados"
};

export default function ProfilePage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile/stats").then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-neutral-500">Carregando perfil...</main>;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between"><a href="/dashboard" className="text-sm font-semibold text-neutral-500">← Dashboard</a><a href="/dashboard/perfil/editar" className="rounded-xl border px-4 py-2 text-sm font-semibold">Editar perfil</a></div>
        <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm">
          <div className="flex items-center gap-5">
            {data.profile?.avatar_url
              ? <img src={data.profile.avatar_url} className="h-20 w-20 rounded-full object-cover" />
              : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-bold text-white">{(data.profile?.display_name || "U").slice(0,1).toUpperCase()}</div>}
            <div>
              <h1 className="text-3xl font-bold">{data.profile?.display_name || "Viajante"}</h1>
              <p className="text-neutral-500">{data.profile?.username ? "@" + data.profile.username : ""}</p>
              <p className="mt-2 text-sm text-neutral-600">{data.profile?.bio || "Ainda não há uma bio."}</p>
            </div>
          </div>
        </section>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Viagens",data.stats.trips],["Países",data.stats.countries],["Cidades",data.stats.cities],["Quilômetros",data.stats.kilometers]].map(([label,value]) =>
            <div className="rounded-2xl border bg-white p-5" key={String(label)}><p className="text-sm text-neutral-500">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>
          )}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-bold">Países visitados</h2><div className="mt-4 flex flex-wrap gap-2">{data.stats.countriesList.map(c => <span key={c} className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm">{c}</span>)}</div></section>
          <section className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-bold">Conquistas</h2><div className="mt-4 flex flex-wrap gap-2">{data.badges.map(b => <span key={b} className="rounded-xl border px-3 py-2 text-sm font-semibold">{badgeNames[b] || b}</span>)}</div></section>
        </div>
      </div>
    </main>
  );
}