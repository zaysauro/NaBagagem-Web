"use client";

import { useState } from "react";

export default function TripPublicToggle({tripId,initial}:{tripId:string;initial:boolean}){
 const [publicTrip,setPublicTrip]=useState(initial); const [loading,setLoading]=useState(false); const [message,setMessage]=useState("");
 async function toggle(){setLoading(true);setMessage("");const next=!publicTrip;const r=await fetch("/api/trips/"+tripId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({is_public:next})});const d=await r.json();if(r.ok)setPublicTrip(!!d.trip?.is_public);else setMessage(d.error||"Não foi possível alterar a visibilidade.");setLoading(false);}
 return <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-bold">Publicação do roteiro</p><p className="mt-1 text-xs text-neutral-500">{publicTrip?"Qualquer pessoa pode descobrir este roteiro no seu perfil e na Descoberta.":"Somente você e colaboradores têm acesso a este roteiro."}</p></div><button onClick={toggle} disabled={loading} className={"shrink-0 rounded-xl px-4 py-2 text-xs font-bold "+(publicTrip?"bg-neutral-950 text-white":"border bg-white")}>{loading?"...":publicTrip?"Público":"Privado"}</button></div>{message&&<p className="mt-2 text-xs text-red-600">{message}</p>}</div>;
}
