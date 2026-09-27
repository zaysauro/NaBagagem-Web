"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Suggestion={trip:any;author:any;locations:any[];matchedInterest:string;isFollowing:boolean};
export default function DiscoverPage(){
 const [data,setData]=useState<any>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 async function load(){const r=await fetch("/api/discover",{cache:"no-store"});const d=await r.json();if(r.ok)setData(d);else setMessage(d.error||"Não foi possível carregar a descoberta.");setLoading(false);}
 useEffect(()=>{load()},[]);
 async function follow(id:string){const r=await fetch("/api/social/follow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:id,action:"follow"})});if(r.ok)load();}
 if(loading)return <main className="min-h-screen bg-[#f4f1ea] p-8 text-neutral-500">Abrindo sua bússola...</main>;
 return <main className="min-h-screen bg-[#f4f1ea] px-4 pb-16 pt-24 sm:px-6">
  <div className="mx-auto max-w-6xl">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-neutral-400">Explorar sem algoritmo barulhento</p><h1 className="mt-1 text-4xl font-black tracking-tight">Descoberta</h1><p className="mt-2 max-w-2xl text-neutral-600">Você diz para onde quer ir. O NaBagagem mostra cadernos públicos de quem já passou por lá.</p></div><Link href="/dashboard/perfil" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Editar interesses</Link></div>
   {message&&<p className="mt-5 rounded-xl bg-white p-4 text-sm text-red-600">{message}</p>}
   {(data?.interests||[]).length>0&&<div className="mt-6 flex flex-wrap gap-2">{data.interests.map((i:any)=><span key={i.name+(i.city||"")} className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{i.name}{i.city&&<span className="text-neutral-400"> · {i.city}</span>}</span>)}</div>}
   {!data?.suggestions?.length?<div className="mt-8 rounded-[2rem] border border-dashed bg-white p-10 text-center"><h2 className="text-2xl font-black">Sua bússola ainda está vazia</h2><p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">Adicione alguns destinos em seu perfil. Quando outros viajantes publicarem roteiros nesses lugares, eles aparecem aqui.</p><Link href="/dashboard/perfil" className="mt-5 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white">Escolher destinos</Link></div>:
   <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.suggestions.map((s:Suggestion)=><article key={s.trip.id} className="group overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl">
    {s.trip.cover_url?<img src={s.trip.cover_url} alt="" className="h-48 w-full object-cover transition duration-700 group-hover:scale-[1.02]"/>:<div className="h-48 bg-[radial-gradient(circle_at_30%_20%,#d9d3c5,transparent_45%),linear-gradient(135deg,#ece8df,#bdb5a4)]"/>}
    <div className="p-5"><span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-bold">{s.matchedInterest}</span><h2 className="mt-3 text-xl font-black">{s.trip.title}</h2><p className="mt-1 line-clamp-2 text-sm text-neutral-500">{s.trip.description||"Um roteiro publicado por outro viajante."}</p>
     <div className="mt-4 flex items-center justify-between gap-3"><Link href={"/perfil/"+(s.author?.username||s.trip.user_id)} className="flex min-w-0 items-center gap-2">{s.author?.avatar_url?<img src={s.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover"/>:<span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(s.author?.display_name||"V")[0]}</span>}<span className="truncate text-sm font-bold">{s.author?.display_name||"Viajante"}</span></Link>{s.author&&!s.isFollowing&&<button onClick={()=>follow(s.author.id)} className="shrink-0 rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Seguir</button>}</div>
     <Link href={"/viagem/"+s.trip.id} className="mt-4 block rounded-xl border px-4 py-2.5 text-center text-sm font-bold hover:bg-neutral-50">Abrir roteiro</Link>
    </div>
   </article>)}</section>}
   {(data?.travelers||[]).length>0&&<section className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Pessoas que cruzam seus caminhos</p><h2 className="mt-1 text-2xl font-black">Outros viajantes</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.travelers.map((x:any)=><Link key={x.profile.id} href={"/perfil/"+(x.profile.username||x.profile.id)} className="rounded-2xl bg-[#f8f7f3] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"><div className="flex items-center gap-3">{x.profile.avatar_url?<img src={x.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(x.profile.display_name||"V")[0]}</span>}<div className="min-w-0"><p className="truncate font-bold">{x.profile.display_name||"Viajante"}</p><p className="text-xs text-neutral-500">{x.trips} roteiro{x.trips===1?"":"s"} relacionado{x.trips===1?"":"s"}</p></div></div></Link>)}</div></section>}
  </div>
 </main>;
}