"use client";
import { useEffect, useState } from "react";

export default function ProfileActions({ username }: { username: string }) {
  const [data,setData]=useState<any>(null);
  const [message,setMessage]=useState("");
  const [list,setList]=useState<any[]|null>(null);
  const [listType,setListType]=useState<"followers"|"following">("followers");
  const [listLoading,setListLoading]=useState(false);
  async function load(){ const r=await fetch("/api/social/profile?username="+encodeURIComponent(username)); const d=await r.json(); if(r.ok)setData(d); }
  useEffect(()=>{load()},[username]);
  async function showConnections(type:"followers"|"following"){
    setListType(type); setListLoading(true); setList(null);
    const r=await fetch("/api/social/connections?username="+encodeURIComponent(username)+"&type="+type);
    const d=await r.json();
    if(r.ok)setList(d.users||[]);
    else setMessage(d.error||"Não foi possível carregar a lista.");
    setListLoading(false);
  }
  async function action(path:string, method:string){
    setMessage("");
    const target=data?.profile?.id;
    if(!target)return;
    const actionName=method==="DELETE" ? (path.includes("/block") ? "unblock" : "unfollow") : (path.includes("/block") ? "block" : "follow");
    const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:target,action:actionName})});
    const d=await r.json(); if(!r.ok){setMessage(d.error||"Não foi possível concluir.");return;} await load();
  }
  if(!data)return <div className="mt-4 text-sm text-neutral-500">Carregando conexões...</div>;
  return <div className="mt-5 flex flex-wrap items-center gap-3">
    <button onClick={()=>showConnections("followers")} className="text-left text-sm text-neutral-500 hover:underline"><b className="text-neutral-900">{data.followers}</b> seguidores</button>
    <button onClick={()=>showConnections("following")} className="text-left text-sm text-neutral-500 hover:underline"><b className="text-neutral-900">{data.following}</b> seguindo</button>
    {data.isFollowing ? <button onClick={()=>action("/api/social/follow","DELETE")} className="rounded-xl border px-4 py-2 text-sm font-semibold">Deixar de seguir</button> : <button onClick={()=>action("/api/social/follow","POST")} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Seguir</button>}
    {data.isBlocked ? <button onClick={()=>action("/api/social/block","DELETE")} className="rounded-xl border px-4 py-2 text-sm">Desbloquear</button> : <button onClick={()=>{if(confirm("Bloquear este usuário?"))action("/api/social/block","POST")}} className="rounded-xl border px-4 py-2 text-sm text-red-600">Bloquear</button>}
    {message&&<span className="w-full text-sm text-red-600">{message}</span>}
    {(listLoading || list) && <div className="w-full rounded-2xl border bg-neutral-50 p-4">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">{listType==="followers"?"Seguidores":"Seguindo"}</p><button onClick={()=>setList(null)} className="text-xs font-semibold text-neutral-500">Fechar</button></div>
      {listLoading ? <p className="mt-3 text-sm text-neutral-500">Carregando...</p> :
        list?.length ? <div className="mt-3 space-y-2">{list.map((u:any)=><a key={u.id} href={"/perfil/"+u.username} className="flex items-center gap-3 rounded-xl bg-white p-2 hover:bg-neutral-100">
          {u.avatar_url?<img src={u.avatar_url} className="h-9 w-9 rounded-full object-cover"/>:<div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(u.display_name||u.username||"U")[0].toUpperCase()}</div>}
          <div><p className="text-sm font-semibold">{u.display_name||"Viajante"}</p><p className="text-xs text-neutral-500">@{u.username||"sem username"}</p></div>
        </a>)}</div> : <p className="mt-3 text-sm text-neutral-500">Nenhuma conexão encontrada.</p>}
    </div>}
  </div>;
}