"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const items=[["/dashboard","Início"],["/buscar","Buscar"],["/feed","Feed"],["/favoritos","Favoritos"],["/dashboard/perfil","Perfil"],["/dashboard/configuracoes","Configurações"]] as const;

export default function SiteHeader({name="NaBagagem"}:{name?:string}){
 const [compact,setCompact]=useState(false);
 const [dark,setDark]=useState(false);
 useEffect(()=>{
   const stored=localStorage.getItem("nabagagem:theme");
   const initial=stored==="dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
   setDark(initial); document.documentElement.classList.toggle("dark",initial);
   const onScroll=()=>setCompact(window.scrollY>24);
   window.addEventListener("scroll",onScroll,{passive:true}); onScroll();
   return()=>window.removeEventListener("scroll",onScroll);
 },[]);
 function toggleTheme(){const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);localStorage.setItem("nabagagem:theme",next?"dark":"light");}
 return <header className={"fixed inset-x-0 top-0 z-[1000] transition-all duration-300 "+(compact?"px-3 pt-2":"px-3 pt-3 sm:px-5 sm:pt-4")}>
   <div className={"mx-auto flex max-w-7xl items-center gap-2 border transition-all duration-300 "+(compact?"h-12 rounded-2xl px-2 shadow-lg backdrop-blur-xl":"h-16 rounded-2xl px-3 shadow-sm backdrop-blur-md")+" bg-white/90 dark:bg-neutral-950/90 dark:border-neutral-800"}>
     <Link href="/dashboard" className={"flex min-w-0 items-center gap-2 rounded-xl px-2 font-bold text-neutral-950 dark:text-white "+(compact?"text-sm":"text-base")}>
       <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm text-white dark:bg-white dark:text-neutral-950">N</span>
       <span className="hidden sm:inline">{name}</span>
     </Link>
     <nav className="ml-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
       {items.map(([href,label])=><Link key={href} href={href} className={"shrink-0 rounded-xl px-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white "+(compact?"py-1.5":"py-2")}>{label}</Link>)}
     </nav>
     <button type="button" onClick={toggleTheme} aria-label={dark?"Ativar modo claro":"Ativar modo noturno"} title={dark?"Modo claro":"Modo noturno"} className={"flex shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 "+(compact?"h-8 w-8 text-sm":"h-10 w-10 text-base")}>{dark?"☀":"☾"}</button>
   </div>
 </header>;
}
