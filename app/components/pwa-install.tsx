"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function PwaInstall(){
  const [event,setEvent]=useState<any>(null);
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const handler=(e:any)=>{e.preventDefault();setEvent(e);setVisible(true)};
    window.addEventListener("beforeinstallprompt",handler);
    return()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);

  if(!visible||!event)return null;

  return <aside aria-label="Instalar NaBagagem" className="fixed bottom-4 left-4 right-4 z-[1100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
    <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white font-black">N</div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-black">Leve o NaBagagem com você</p>
      <p className="text-xs text-neutral-500">Instale como app para abrir direto das suas viagens.</p>
    </div>
    <button aria-label="Instalar NaBagagem" onClick={async()=>{await event.prompt();setVisible(false)}} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950">
      <Download aria-hidden="true" size={14}/> Instalar
    </button>
    <button aria-label="Fechar aviso de instalação" onClick={()=>setVisible(false)} className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950">
      <X aria-hidden="true" size={16}/>
    </button>
  </aside>;
}
