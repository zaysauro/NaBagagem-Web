"use client";
import { useEffect, useState } from "react";

export default function ProfileActions({ username }: { username: string }) {
  const [data,setData]=useState<any>(null);
  const [message,setMessage]=useState("");
  async function load(){ const r=await fetch("/api/social/profile?username="+encodeURIComponent(username)); const d=await r.json(); if(r.ok)setData(d); }
  useEffect(()=>{load()},[username]);
  async function action(path:string, method:string){
    setMessage("");
    const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify({username})});
    const d=await r.json(); if(!r.ok){setMessage(d.error||"Não foi possível concluir.");return;} await load();
  }
  if(!data)return <div className="mt-4 text-sm text-neutral-500">Carregando conexões...</div>;
  return <div className="mt-5 flex flex-wrap items-center gap-3">
    <span className="text-sm text-neutral-500"><b className="text-neutral-900">{data.followers}</b> seguidores</span>
    <span className="text-sm text-neutral-500"><b className="text-neutral-900">{data.following}</b> seguindo</span>
    {data.isFollowing ? <button onClick={()=>action("/api/social/follow","DELETE")} className="rounded-xl border px-4 py-2 text-sm font-semibold">Deixar de seguir</button> : <button onClick={()=>action("/api/social/follow","POST")} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Seguir</button>}
    {data.isBlocked ? <button onClick={()=>action("/api/social/block","DELETE")} className="rounded-xl border px-4 py-2 text-sm">Desbloquear</button> : <button onClick={()=>{if(confirm("Bloquear este usuário?"))action("/api/social/block","POST")}} className="rounded-xl border px-4 py-2 text-sm text-red-600">Bloquear</button>}
    {message&&<span className="w-full text-sm text-red-600">{message}</span>}
  </div>;
}