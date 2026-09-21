"use client";

import { useEffect, useMemo, useState } from "react";

type Expense={amount:number;currency:string};
type Item={completed:boolean};
type Event={status:string;reservation_name:string|null;confirmation_code:string|null;reservation_url:string|null};

export default function TripSummary({tripId,initialEvents=[]}:{tripId:string;initialEvents?:Event[]}) {
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [events,setEvents]=useState<Event[]>(initialEvents);
  useEffect(()=>{
    let active=true;
    Promise.all([
      fetch("/api/trips/"+tripId+"/expenses",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/trips/"+tripId+"/checklist",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/trips/"+tripId+"/events",{cache:"no-store"}).then(r=>r.ok?r.json():null)
    ]).then(([a,b,c])=>{if(!active)return;if(a?.expenses)setExpenses(a.expenses);if(b?.items)setItems(b.items);if(c?.events)setEvents(c.events)}).catch(()=>{});
    return()=>{active=false};
  },[tripId]);
  const expenseBRL=useMemo(()=>expenses.filter(e=>e.currency==="BRL").reduce((s,e)=>s+Number(e.amount),0),[expenses]);
  const checklist=items.length?Math.round(items.filter(i=>i.completed).length/items.length*100):0;
  const completed=events.filter(e=>e.status==="completed").length;
  const reservations=events.filter(e=>e.reservation_name||e.confirmation_code||e.reservation_url).length;
  return <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <div><h2 className="text-xl font-bold">Resumo da viagem</h2><p className="mt-1 text-sm text-neutral-500">Uma visão rápida do andamento do planejamento.</p></div>
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {[["Atividades",events.length],["Concluídas",completed],["Reservas",reservations],["Checklist",checklist+"%"],["Gastos BRL",expenseBRL.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})],["Itens",items.length]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">{label}</p><strong className="mt-1 block text-lg text-neutral-950">{value}</strong></div>)}
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div><div className="flex justify-between text-xs font-semibold"><span>Progresso do itinerário</span><span>{events.length?Math.round(completed/events.length*100):0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-neutral-950 transition-all" style={{width:(events.length?Math.round(completed/events.length*100):0)+"%"}}/></div></div>
      <div><div className="flex justify-between text-xs font-semibold"><span>Checklist</span><span>{checklist}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-neutral-950 transition-all" style={{width:checklist+"%"}}/></div></div>
    </div>
  </section>;
}
