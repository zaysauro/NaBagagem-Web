"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Notifications from "@/app/dashboard/notifications";

const items=[["/dashboard","Início"],["/buscar","Buscar"],["/feed","Feed"],["/favoritos","Favoritos"],["/dashboard/perfil","Perfil"],["/dashboard/configuracoes","Configurações"]] as const;

export default function SiteHeader({name="NaBagagem"}:{name?:string}){
 const [compact,setCompact]=useState(false);
 const [dark,setDark]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{
   const stored=localStorage.getItem("nabagagem:theme");
   const initial=stored==="dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
   setDark(initial); document.documentElement.classList.toggle("dark",initial);
   const onScroll=()=>setCompact(window.scrollY>24);
   window.addEventListener("scroll",onScroll,{passive:true}); onScroll();
   return()=>window.removeEventListener("scroll",onScroll);
 },[]);
 useEffect(()=>{ if(compact) setMenuOpen(false); },[compact]);
 function toggleTheme(){const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);localStorage.setItem("nabagagem:theme",next?"dark":"light");}
 return <header className={"fixed inset-x-0 top-0 z-[1000] transition-all duration-300 "+(compact?"px-2 pt-2 sm:px-3":"px-3 pt-3 sm:px-5 sm:pt-4")}>
   <div className={"relative mx-auto flex max-w-7xl items-center gap-1 border transition-all duration-300 "+(compact?"h-12 rounded-2xl px-2 shadow-lg backdrop-blur-xl":"h-16 rounded-2xl px-2 shadow-sm backdrop-blur-md")+" bg-white/90 dark:bg-neutral-950/90 dark:border-neutral-800"}>
     <Link href="/dashboard" className={"flex min-w-0 shrink-0 items-center gap-2 rounded-xl px-2 font-bold text-neutral-950 dark:text-white "+(compact?"text-sm":"text-base")}>
       <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm text-white dark:bg-white dark:text-neutral-950">N</span>
       <span className="hidden sm:inline">{name}</span>
     </Link>

     <nav className="ml-1 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
       {items.map(([href,label])=><Link key={href} href={href} className={"shrink-0 rounded-xl px-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white "+(compact?"py-1.5":"py-2")}>{label}</Link>)}
     </nav>

     <div className="ml-auto flex shrink-0 items-center gap-1">
       <Notifications />
       <button type="button" onClick={toggleTheme} aria-label={dark?"Ativar modo claro":"Ativar modo noturno"} title={dark?"Modo claro":"Modo noturno"} className={"flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 "+(compact?"h-8 w-8 text-sm":"h-10 w-10 text-base")}>{dark?"☀":"☾"}</button>
       <button type="button" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-label={menuOpen?"Fechar menu":"Abrir menu"} className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-lg font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 md:hidden "+(compact?"h-8 w-8 text-base":"")}>{menuOpen?"×":"☰"}</button>
     </div>

     {menuOpen&&<div className="absolute left-2 right-2 top-[calc(100%+8px)] rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden">
       <nav className="grid gap-1">
         {items.map(([href,label])=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">{label}</Link>)}
       </nav>
     </div>}
   </div>
 </header>;
}
