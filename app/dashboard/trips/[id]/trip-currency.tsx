"use client";

import { useState } from "react";

export default function TripCurrency() {
  const [amount,setAmount]=useState("100");
  const [from,setFrom]=useState("BRL");
  const [to,setTo]=useState("USD");
  const [result,setResult]=useState<number|null>(null);
  const [rate,setRate]=useState<number|null>(null);
  const [date,setDate]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function convert(e:React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r=await fetch("/api/currency?from="+from+"&to="+to+"&amount="+amount);
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"Erro");
      setResult(d.converted); setRate(d.rate); setDate(d.date||"");
    } catch(e) { setError(e instanceof Error ? e.message : "Erro ao converter."); }
    finally { setLoading(false); }
  }

  return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Câmbio</p>
    <h2 className="mt-1 text-xl font-bold">Conversor de moedas</h2>
    <p className="mt-1 text-sm text-neutral-500">Use uma cotação online para estimar os gastos da viagem.</p>
    <form onSubmit={convert} className="mt-5 grid gap-2 sm:grid-cols-4">
      <input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="rounded-xl border p-2.5" />
      <select value={from} onChange={e=>setFrom(e.target.value)} className="rounded-xl border p-2.5">{["BRL","USD","EUR","JPY","GBP","CAD","AUD","CHF"].map(x=><option key={x}>{x}</option>)}</select>
      <select value={to} onChange={e=>setTo(e.target.value)} className="rounded-xl border p-2.5">{["BRL","USD","EUR","JPY","GBP","CAD","AUD","CHF"].map(x=><option key={x}>{x}</option>)}</select>
      <button className="rounded-xl bg-neutral-950 p-2.5 font-semibold text-white disabled:opacity-50" disabled={loading}>{loading?"Consultando...":"Converter"}</button>
    </form>
    {result!=null && <div className="mt-4 rounded-2xl bg-neutral-50 p-4"><p className="text-2xl font-bold">{Number(result).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} {to}</p><p className="mt-1 text-sm text-neutral-500">1 {from} = {Number(rate).toLocaleString("pt-BR",{maximumFractionDigits:6})} {to}{date ? " · cotação de "+date : ""}</p></div>}
    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
  </section>;
}
