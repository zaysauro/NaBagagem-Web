"use client";

import { useEffect, useState } from "react";

type Interest={id:string;name:string;city:string|null;country:string|null};

export default function ProfileInterests(){
 const [items,setItems]=useState<Interest[]>([]);
 const [name,setName]=useState("");
 const [city,setCity]=useState("");
 const [country,setCountry]=useState("");
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/profile/interests",{cache:"no-store"});const d=await r.json();if(r.ok)setItems(d.interests||[]);setLoading(false);}
 useEffect(()=>{load()},[]);
 async function add(e:React.FormEvent){e.preventDefault();if(!name.trim())return;setMessage("");const r=await fetch("/api/profile/interests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,city,country})});const d=await r.json();if(!r.ok){setMessage(d.error||"Não foi possível salvar.");return;}setItems(x=>[d.interest,...x]);setName("");setCity("");setCountry("");}
 async function remove(id:string){await fetch("/api/profile/interests?id="+encodeURIComponent(id),{method:"DELETE"});setItems(x=>x.filter(i=>i.id!==id));}
 return <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Descoberta</p><h2 className="mt-1 text-xl font-bold">Destinos que quero conhecer</h2><p className="mt-1 text-sm text-neutral-500">O NaBagagem usa isso para encontrar roteiros públicos de viajantes que já estiveram nesses lugares.</p></div>
  <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Destino (ex.: Kyoto)" className="rounded-xl border px-3 py-2.5"/><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Cidade" className="rounded-xl border px-3 py-2.5"/><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="País" className="rounded-xl border px-3 py-2.5"/><button className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white">Adicionar</button></form>
  {message&&<p className="mt-2 text-sm text-red-600">{message}</p>}
  {!loading&&<div className="mt-4 flex flex-wrap gap-2">{items.map(i=><span key={i.id} className="group flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-sm"><span>{i.name}{i.city&&<span className="text-neutral-400"> · {i.city}</span>}</span><button type="button" onClick={()=>remove(i.id)} className="text-neutral-400 hover:text-red-600" aria-label={"Remover "+i.name}>×</button></span>)}</div>}
 </section>;
}