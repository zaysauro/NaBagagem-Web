"use client";

import { useEffect, useMemo, useState } from "react";

type Expense={id:string;title:string;category:string;amount:number;currency:string;expense_date:string|null;notes:string|null};
type Item={id:string;title:string;category:string;completed:boolean};

export default function TripTools({tripId}:{tripId:string}){
 const [expenses,setExpenses]=useState<Expense[]>([]); const [items,setItems]=useState<Item[]>([]);
 const [expense,setExpense]=useState({title:"",category:"other",amount:"",currency:"BRL",expense_date:"",notes:""});
 const [item,setItem]=useState({title:"",category:"general"}); const [message,setMessage]=useState("");
 const total=useMemo(()=>expenses.reduce((sum,e)=>sum+Number(e.amount),0),[expenses]);
 async function load(){const[a,b]=await Promise.all([fetch("/api/trips/"+tripId+"/expenses"),fetch("/api/trips/"+tripId+"/checklist")]);if(a.ok)setExpenses((await a.json()).expenses);if(b.ok)setItems((await b.json()).items);}
 useEffect(()=>{load()},[]);
 async function addExpense(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/trips/"+tripId+"/expenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(expense)});const d=await r.json();if(!r.ok){setMessage(d.error||"Erro ao adicionar despesa.");return;}setExpenses(x=>[d.expense,...x]);setExpense({title:"",category:"other",amount:"",currency:"BRL",expense_date:"",notes:""});}
 async function addItem(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/trips/"+tripId+"/checklist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item)});const d=await r.json();if(!r.ok){setMessage(d.error||"Erro ao adicionar item.");return;}setItems(x=>[...x,d.item]);setItem({title:"",category:"general"});}
 async function toggle(i:Item){const r=await fetch("/api/trips/"+tripId+"/checklist?itemId="+i.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed:!i.completed})});const d=await r.json();if(r.ok)setItems(x=>x.map(v=>v.id===i.id?d.item:v));}
 async function removeExpense(id:string){const r=await fetch("/api/trips/"+tripId+"/expenses?expenseId="+id,{method:"DELETE"});if(r.ok)setExpenses(x=>x.filter(v=>v.id!==id));}
 async function removeItem(id:string){const r=await fetch("/api/trips/"+tripId+"/checklist?itemId="+id,{method:"DELETE"});if(r.ok)setItems(x=>x.filter(v=>v.id!==id));}
 return <section className="mt-7 grid gap-7 lg:grid-cols-2">
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Gastos</h2><p className="text-sm text-neutral-500">Controle despesas por categoria e moeda.</p></div><strong>{total.toFixed(2)} {expense.currency}</strong></div>
   <form onSubmit={addExpense} className="mt-5 grid gap-2 sm:grid-cols-2"><input required placeholder="Descrição" value={expense.title} onChange={e=>setExpense({...expense,title:e.target.value})} className="rounded-xl border p-2.5 sm:col-span-2"/><input required type="number" min="0" step="0.01" placeholder="Valor" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})} className="rounded-xl border p-2.5"/><select value={expense.category} onChange={e=>setExpense({...expense,category:e.target.value})} className="rounded-xl border p-2.5"><option value="transport">Transporte</option><option value="food">Alimentação</option><option value="lodging">Hospedagem</option><option value="tickets">Ingressos</option><option value="shopping">Compras</option><option value="other">Outros</option></select><input value={expense.currency} onChange={e=>setExpense({...expense,currency:e.target.value.toUpperCase()})} maxLength={8} className="rounded-xl border p-2.5" placeholder="BRL"/><input type="date" value={expense.expense_date} onChange={e=>setExpense({...expense,expense_date:e.target.value})} className="rounded-xl border p-2.5"/><button className="rounded-xl bg-neutral-950 p-2.5 font-semibold text-white sm:col-span-2">Adicionar gasto</button></form>
   <div className="mt-5 space-y-2">{expenses.map(e=><div key={e.id} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3"><div><b>{e.title}</b><p className="text-xs text-neutral-500">{e.category} · {e.expense_date||"sem data"}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{Number(e.amount).toFixed(2)} {e.currency}</span><button onClick={()=>removeExpense(e.id)} className="text-xs text-red-600">Remover</button></div></div>)}</div>
  </div>
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Checklist</h2><p className="text-sm text-neutral-500">Coisas para fazer ou levar nesta viagem.</p>
   <form onSubmit={addItem} className="mt-5 flex gap-2"><input required placeholder="Ex.: Passaporte" value={item.title} onChange={e=>setItem({...item,title:e.target.value})} className="min-w-0 flex-1 rounded-xl border p-2.5"/><button className="rounded-xl bg-neutral-950 px-4 font-semibold text-white">Adicionar</button></form>
   <div className="mt-5 space-y-2">{items.map(i=><div key={i.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3"><input type="checkbox" checked={i.completed} onChange={()=>toggle(i)} className="h-4 w-4"/><span className={i.completed?"flex-1 text-sm text-neutral-400 line-through":"flex-1 text-sm"}>{i.title}</span><button onClick={()=>removeItem(i.id)} className="text-xs text-red-600">Remover</button></div>)}</div>
  </div>
  {message&&<p className="text-sm text-red-600 lg:col-span-2">{message}</p>}
 </section>
}
