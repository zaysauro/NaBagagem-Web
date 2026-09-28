"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Compass, Luggage, Sparkles } from "lucide-react";

export default function NewTripPage() {
  const router = useRouter();
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [startDate,setStartDate]=useState("");
  const [endDate,setEndDate]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const dateError=useMemo(()=>startDate&&endDate&&endDate<startDate?"A data de término precisa ser igual ou posterior ao início.":"",[startDate,endDate]);
  const canSubmit=title.trim().length>1&&!dateError&&!loading;

  async function submit(event:FormEvent){
    event.preventDefault();
    if(!canSubmit)return;
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/trips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:title.trim(),description:description.trim(),start_date:startDate||null,end_date:endDate||null})});
      const result=await response.json();
      if(!response.ok){setError(result.error||"Não foi possível criar a viagem.");return;}
      router.push("/dashboard");router.refresh();
    }catch{setError("Não foi possível conectar ao servidor. Tente novamente.");}
    finally{setLoading(false);}
  }

  return <main className="min-h-screen bg-[#f4f1ea] px-4 pb-12 pt-7 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-neutral-600 transition hover:bg-black/5 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"><ArrowLeft size={16} aria-hidden="true"/> Minhas viagens</Link>

      <div className="mt-6 grid gap-5 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
        <aside className="rounded-[2rem] bg-neutral-950 p-7 text-white shadow-xl sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-neutral-950"><Luggage size={22} aria-hidden="true"/></div>
          <p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-white/40">Novo capítulo</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Vamos colocar essa viagem na bagagem.</h1>
          <p className="mt-5 leading-7 text-white/60">Comece pelo básico. Depois você poderá adicionar destinos, atividades, mapa, reservas, gastos, clima e memórias.</p>
          <div className="mt-8 space-y-3 text-sm font-semibold text-white/75">
            <p className="flex gap-3"><Check size={18} className="shrink-0 text-white" aria-hidden="true"/> Roteiro organizado por dias</p>
            <p className="flex gap-3"><Check size={18} className="shrink-0 text-white" aria-hidden="true"/> Mapa e destinos</p>
            <p className="flex gap-3"><Check size={18} className="shrink-0 text-white" aria-hidden="true"/> Gastos, reservas e memórias</p>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f1ea]"><Sparkles size={18} aria-hidden="true"/></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-neutral-400">Passo 1</p><h2 className="font-black">Identidade da viagem</h2></div></div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block"><span className="text-sm font-bold text-neutral-800">Nome da viagem</span><input required autoFocus value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} placeholder="Ex.: Japão 2027" className="mt-2 min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"/></label>
            <label className="block"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-neutral-800">Descrição <span className="font-normal text-neutral-400">(opcional)</span></span><span className="text-xs text-neutral-400">{description.length}/240</span></div><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={240} placeholder="Por que você está fazendo essa viagem? O que não pode faltar?" rows={5} className="mt-2 w-full resize-none rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"/></label>

            <div className="rounded-2xl bg-[#f8f7f3] p-4 sm:p-5">
              <div className="flex items-center gap-2"><CalendarDays size={17} aria-hidden="true"/><p className="text-sm font-black">Quando?</p></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Começa em</span><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"/></label>
                <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Termina em</span><input type="date" min={startDate||undefined} value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"/></label>
              </div>
              {dateError&&<p role="alert" className="mt-3 text-xs font-semibold text-red-600">{dateError}</p>}
            </div>

            {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={!canSubmit} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2">
              {loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true"/> Criando viagem...</>:<><Compass size={18} aria-hidden="true"/> Criar viagem</>}
            </button>
          </form>
        </section>
      </div>
    </div>
  </main>;
}
