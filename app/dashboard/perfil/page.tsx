"use client";

import { useEffect, useState } from "react";
import WorldMap from "./world-map";
import { StatsChart } from "./stats-chart";

type Data = {
  profile:{display_name:string|null;username:string|null;avatar_url:string|null;bio:string|null}|null;
  stats:{
    trips:number;countries:number;cities:number;kilometers:number;travelDays:number;travelHours:number;
    countryPercent:number;countriesList:string[];citiesList:string[];totalExpensesBRL:number;
  };
  monthly:{label:string;trips:number;expenses:number}[];
  badges:string[];
  earnedBadges:{badge_key:string;earned_at:string}[];
};

const badgeNames:Record<string,string>={
  first_trip:"Primeira viagem",
  trip_completed:"Primeira viagem concluída",
  three_countries:"3 países explorados",
  ten_countries:"10 países explorados",
  "1000_km":"1.000 km viajados",
  "25_cities":"25 cidades",
  "30_travel_days":"30 dias na estrada"
};

export default function ProfilePage(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");

  useEffect(()=>{fetch("/api/profile/stats").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d)}).catch(e=>setError(e.message))},[]);

  if(error)return <main className="p-8 text-red-600">{error}</main>;
  if(!data)return <main className="p-8 text-neutral-500">Carregando estatísticas...</main>;

  const percent=data.stats.countryPercent;
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <a href="/dashboard" className="text-sm font-semibold text-neutral-500">← Dashboard</a>
          <a href="/dashboard/perfil/editar" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Editar perfil</a>
        </div>

        <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            {data.profile?.avatar_url
              ? <img src={data.profile.avatar_url} className="h-20 w-20 rounded-full object-cover"/>
              : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-bold text-white">{(data.profile?.display_name||"U").slice(0,1).toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold">{data.profile?.display_name||"Viajante"}</h1>
              <p className="text-neutral-500">{data.profile?.username?"@"+data.profile.username:""}</p>
              <p className="mt-2 text-sm text-neutral-600">{data.profile?.bio||"Ainda não há uma bio."}</p>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex justify-between text-xs font-semibold"><span>Exploração do mundo</span><span>{percent.toFixed(1)}%</span></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900" style={{width:`${percent}%`}}/></div>
              <p className="mt-2 text-xs text-neutral-500">{data.stats.countries} de 195 países</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {[
            ["Viagens",data.stats.trips],["Países",data.stats.countries],["Cidades",data.stats.cities],
            ["Quilômetros",data.stats.kilometers.toLocaleString("pt-BR")],["Dias viajando",data.stats.travelDays],
            ["Horas de roteiro",data.stats.travelHours],["Gastos BRL",data.stats.totalExpensesBRL.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})]
          ].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <section className="rounded-3xl border bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Mapa-múndi</h2><p className="text-sm text-neutral-500">Países registrados nas suas viagens</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{data.stats.countries} visitados</span></div>
            <WorldMap countries={data.stats.countriesList}/>
          </section>
          <section className="rounded-3xl border bg-white p-5">
            <h2 className="text-xl font-bold">Países visitados</h2>
            <div className="mt-4 flex max-h-80 flex-wrap content-start gap-2 overflow-auto">{data.stats.countriesList.length?data.stats.countriesList.map(c=><span key={c} className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm">{c}</span>):<p className="text-sm text-neutral-500">Adicione destinos às suas viagens para começar.</p>}</div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border bg-white p-6">
          <h2 className="mb-5 text-xl font-bold">Histórico</h2>
          <StatsChart data={data.monthly}/>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Conquistas</h2><p className="text-sm text-neutral-500">Badges são registrados automaticamente conforme você viaja.</p></div><span className="text-sm font-semibold">{data.earnedBadges.length} desbloqueadas</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(badgeNames).map(([key,name])=>{
              const earned=data.badges.includes(key);
              return <div key={key} className={`rounded-2xl border p-4 ${earned?"bg-neutral-950 text-white":"bg-neutral-50 text-neutral-400"}`}>
                <div className="text-2xl">{earned?"✦":"○"}</div><p className="mt-2 text-sm font-bold">{name}</p><p className="mt-1 text-xs">{earned?"Desbloqueada":"Ainda não desbloqueada"}</p>
              </div>
            })}
          </div>
        </section>

        <div className="mt-6 flex gap-3"><a href="/dashboard" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Minhas viagens</a><a href="/favoritos" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Favoritos</a><a href="/dashboard/configuracoes" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Configurações</a></div>
      </div>
    </main>
  );
}