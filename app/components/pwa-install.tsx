"use client";

import { useEffect, useState } from "react";

export default function PwaInstall(){
 const [event,setEvent]=useState<any>(null); const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const handler=(e:any)=>{e.preventDefault();setEvent(e);setVisible(true)};
  window.addEventListener("beforeinstallprompt",handler);
  return()=>window.removeEventListener("beforeinstallprompt",handler);
 },[]);
 if(!visible||!event)return null;
 return <div className="fixed bottom-4 left-4 right-4 z-[1100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white font-black">N</div><div className="min-w-0 flex-1"><p className="text-sm font-black">Leve o NaBagagem com você</p><p className="text-xs text-neutral-500">Instale como app para abrir direto das suas viagens.</p></div><button onClick={async()=>{await event.prompt();setVisible(false)}} className="rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Instalar</button><button onClick={()=>setVisible(false)} className="text-xs font-bold text-neutral-400">Agora não</button></div>;
}
