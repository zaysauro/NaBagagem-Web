"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SharedTripActions({ token }: { token: string }) {
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  async function copyTrip(){
    setLoading(true); setMessage("");
    const r=await fetch("/api/trips/copy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
    const d=await r.json(); setLoading(false);
    if(r.status===401){window.location.href="/login";return;}
    if(!r.ok){setMessage(d.error||"Não foi possível copiar.");return;}
    window.location.href="/dashboard/trips/"+d.trip_id;
  }
  return <div className="mt-5 flex flex-wrap items-center gap-3">
    <button onClick={copyTrip} disabled={loading} className="rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white">{loading?"Copiando...":"Copiar para minhas viagens"}</button>
    {message&&<span className="text-sm text-red-600">{message}</span>}
  </div>;
}