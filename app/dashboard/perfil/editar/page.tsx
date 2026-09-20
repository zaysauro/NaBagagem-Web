"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfileSettings() {
 const [form,setForm]=useState({display_name:"",username:"",bio:"",avatar_url:""});
 const [publicStats,setPublicStats]=useState(true); const [message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/profile").then(r=>r.json()).then(d=>{if(d.profile)setForm({...form,...d.profile});setPublicStats(d.is_public??true)})},[]);
 async function save(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();setMessage(r.ok?"Perfil salvo.":d.error||"Erro ao salvar.");}
 async function privacy(v:boolean){setPublicStats(v);const r=await fetch("/api/profile/privacy",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({is_public:v})});if(!r.ok)setMessage("Não foi possível alterar a privacidade.");}
 return <main className="min-h-screen bg-neutral-50 px-6 py-8"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="text-sm font-semibold text-neutral-500">← Dashboard</Link><h1 className="mt-5 text-3xl font-bold">Editar perfil</h1>
 <form onSubmit={save} className="mt-6 space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
 {([["display_name","Nome","Bruno"],["username","Nome de usuário","bruno"],["avatar_url","URL da foto","https://..."]] as const).map(([k,l,p])=><label key={k} className="block text-sm font-semibold">{l}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p} className="mt-1 w-full rounded-xl border p-3"/></label>)}
 <label className="block text-sm font-semibold">Bio<textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} rows={4} className="mt-1 w-full rounded-xl border p-3"/></label>
 <button className="rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white">Salvar perfil</button>{message&&<p className="text-sm text-neutral-600">{message}</p>}
 </form>
 <section className="mt-5 rounded-3xl border bg-white p-6 shadow-sm"><h2 className="font-bold">Privacidade</h2><label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={publicStats} onChange={e=>privacy(e.target.checked)} className="h-5 w-5"/><span className="text-sm">Permitir que outras pessoas vejam meu perfil e estatísticas</span></label></section>
 </div></main>;
}
