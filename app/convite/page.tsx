"use client";
import Link from "next/link";
import {useState} from "react";
export default function InvitationPage(){const[error,setError]=useState("");const[busy,setBusy]=useState(false);
 async function accept(){setBusy(true);setError("");try{const token=new URLSearchParams(window.location.search).get("token");const r=await fetch("/api/invitations/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const d=await r.json();if(!r.ok)throw new Error(d.error);window.location.assign(`/dashboard/trips/${d.trip_id}`);}catch(e){setError(e instanceof Error?e.message:"Não foi possível aceitar.");}finally{setBusy(false);}}
 return <main className="mx-auto max-w-lg p-6 pt-24"><h1 className="text-2xl font-bold">Planeje esta viagem em grupo</h1><p className="my-4">Entre com o e-mail convidado e aceite para acessar a viagem.</p><Link href="/login" className="underline">Entrar na minha conta</Link>{error&&<p role="alert" className="my-4 text-red-700">{error}</p>}<button onClick={()=>void accept()} disabled={busy} className="mt-6 block rounded-xl bg-neutral-950 p-4 text-white">{busy?"Aceitando…":"Aceitar convite"}</button></main>;
}
