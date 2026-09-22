"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/site-header";

type Post={id:string;user_id:string;trip_id:string|null;title:string;body:string|null;created_at:string;profiles:any;media:{id:string;public_url:string}[]};

export default function FavoritesPage(){
 const [posts,setPosts]=useState<Post[]>([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 async function load(){
   const r=await fetch("/api/feed/bookmarks",{cache:"no-store"}); const d=await r.json();
   if(r.ok)setPosts(d.posts||[]); else setMessage(d.error||"Não foi possível carregar os favoritos.");
   setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function remove(id:string){
   const r=await fetch("/api/feed/"+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"unbookmark"})});
   if(r.ok)setPosts(x=>x.filter(p=>p.id!==id)); else setMessage("Não foi possível remover dos favoritos.");
 }
 return <main className="min-h-screen bg-neutral-50 px-4 pb-8 pt-24 sm:px-6"><SiteHeader /><div className="mx-auto max-w-4xl">
  <div className="flex items-center justify-between"><Link href="/feed" className="text-sm font-semibold text-neutral-500">← Feed</Link><Link href="/dashboard/perfil" className="text-sm font-semibold">Meu perfil</Link></div>
  <h1 className="mt-5 text-3xl font-bold">Favoritos</h1><p className="mt-1 text-neutral-500">Publicações que você salvou para rever depois.</p>
  {message&&<p className="mt-4 rounded-xl bg-white p-3 text-sm text-red-600">{message}</p>}
  {loading?<p className="mt-6 text-sm text-neutral-500">Carregando favoritos...</p>:posts.length===0?<div className="mt-6 rounded-3xl border border-dashed bg-white p-10 text-center"><h2 className="text-xl font-bold">Nenhum favorito ainda</h2><p className="mt-2 text-sm text-neutral-500">No feed, use “Salvar” em uma publicação para encontrá-la aqui.</p><Link href="/feed" className="mt-5 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Explorar feed</Link></div>:<div className="mt-6 space-y-4">{posts.map(p=><article key={p.id} className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{p.title}</h2><p className="text-xs text-neutral-400">{p.profiles?.display_name||"Viajante"} · {new Date(p.created_at).toLocaleString("pt-BR")}</p></div><button onClick={()=>remove(p.id)} className="text-sm font-semibold text-red-600">Remover</button></div>{p.body&&<p className="mt-3 whitespace-pre-wrap text-neutral-700">{p.body}</p>}{p.media?.length>0&&<div className="mt-4 grid gap-2 sm:grid-cols-2">{p.media.map(m=><img key={m.id} src={m.public_url} alt="" className="max-h-72 w-full rounded-2xl object-cover"/>)}</div>}{p.trip_id&&<Link href={"/dashboard/trips/"+p.trip_id} className="mt-4 inline-block text-sm font-semibold">Abrir viagem</Link>}</article>)}</div>}
 </div></main>
}
