"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/app/components/site-header";

type Media = { id: string; public_url: string };
type Comment = {
  id:string; user_id:string; body:string; approved:boolean; created_at:string;
  profiles?: {display_name?:string; username?:string}|null;
};
type Trip = { id: string; title: string; start_date: string | null; end_date: string | null };
type Post = {
  id:string; user_id:string; title:string; body:string|null; created_at:string;
  isMine:boolean;
  trip_id:string|null; visibility:string; likedByMe:boolean; likes:number;
  comments:Comment[]; profiles:any; media:Media[]; bookmarkedByMe:boolean;
};

const visibilityLabels:Record<string,string>={public:"Público",followers:"Seguidores",private:"Somente eu"};
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2000;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob) return file;
    const baseName = file.name.replace(/\\.[^.]+$/, "") || "foto";
    return new File([blob], baseName + ".webp", { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}


export default function FeedPage() {
  const [posts,setPosts]=useState<Post[]>([]);
  const [trips,setTrips]=useState<Trip[]>([]);
  const [tripId,setTripId]=useState("");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [visibility,setVisibility]=useState("public");
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [page,setPage]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [message,setMessage]=useState("");
  const [pendingImages,setPendingImages]=useState<File[]>([]);
  const [editing,setEditing]=useState<string|null>(null);
  const [editTitle,setEditTitle]=useState("");
  const [editBody,setEditBody]=useState("");
  const [editVisibility,setEditVisibility]=useState("public");
  const fileRef=useRef<HTMLInputElement>(null);

  async function load(reset = true){
    const targetPage = reset ? 0 : page + 1;
    if (!reset) setLoadingMore(true);
    const r=await fetch("/api/feed?page="+targetPage+"&pageSize=20",{cache:"no-store"});
    const d=await r.json();
    if(r.ok){
      setPosts(current => reset ? (d.posts||[]) : [...current, ...(d.posts||[])]);
      setPage(targetPage);
      setHasMore(!!d.hasMore);
    } else setMessage(d.error||"Não foi possível carregar o feed.");
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(()=>{
    load(true);
    fetch("/api/trips").then(async r=>{const d=await r.json();if(r.ok)setTrips(d.trips||[]);}).catch(()=>{});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!key)return;
    const supabase=createClient();
    const channel=supabase.channel("na-bagagem-feed")
      .on("postgres_changes",{event:"*",schema:"public",table:"feed_posts"},()=>load(true))
      .on("postgres_changes",{event:"*",schema:"public",table:"feed_likes"},()=>load(true))
      .on("postgres_changes",{event:"*",schema:"public",table:"feed_comments"},()=>load(true))
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[]);

  async function publish(e:React.FormEvent){
    e.preventDefault(); setMessage("");
    const r=await fetch("/api/feed",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({title,body,visibility,trip_id:tripId||null})});
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Erro ao publicar.");return;}
    if(pendingImages.length){
      for(const image of pendingImages.slice(0,5)){
        const form=new FormData(); form.append("post_id",d.post.id); form.append("file",image);
        const upload=await fetch("/api/feed/upload",{method:"POST",body:form});
        if(!upload.ok){const error=await upload.json();setMessage("Publicação criada, mas uma imagem não foi enviada: "+(error.error||"erro"));break;}
      }
    }
    setTitle("");setBody("");setVisibility("public");setTripId("");setPendingImages([]);
    if(fileRef.current)fileRef.current.value="";
    await load(true);
  }

  async function bookmark(post:Post){
    const action=post.bookmarkedByMe?"unbookmark":"bookmark";
    const r=await fetch("/api/feed/"+post.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});
    if(r.ok)setPosts(x=>x.map(p=>p.id===post.id?{...p,bookmarkedByMe:!post.bookmarkedByMe}:p));
  }

  async function like(post:Post){
    const action=post.likedByMe?"unlike":"like";
    const r=await fetch("/api/feed/"+post.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});
    if(r.ok)setPosts(x=>x.map(p=>p.id===post.id?{...p,likedByMe:!post.likedByMe,likes:p.likes+(post.likedByMe?-1:1)}:p));
  }

  async function comment(post:Post){
    const text=window.prompt("Comentário");
    if(!text?.trim())return;
    const r=await fetch("/api/feed/"+post.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"comment",body:text})});
    const d=await r.json();
    if(r.ok){
      setPosts(x=>x.map(p=>p.id===post.id?{...p,comments:[...p.comments,d.comment]}:p));
      setMessage("Comentário enviado. O autor precisa aprová-lo para aparecer publicamente.");
    }else setMessage(d.error||"Não foi possível comentar.");
  }

  function startEdit(post:Post){
    setEditing(post.id);setEditTitle(post.title);setEditBody(post.body||"");setEditVisibility(post.visibility);
  }

  async function saveEdit(id:string){
    const r=await fetch("/api/feed/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({title:editTitle,body:editBody,visibility:editVisibility})});
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Não foi possível editar.");return;}
    setPosts(x=>x.map(p=>p.id===id?{...p,...d.post}:p));setEditing(null);
  }

  async function removePost(id:string){
    if(!window.confirm("Excluir esta publicação? Essa ação não pode ser desfeita."))return;
    const r=await fetch("/api/feed/"+id,{method:"DELETE"});
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Não foi possível excluir.");return;}
    setPosts(x=>x.filter(p=>p.id!==id));
  }

  async function moderateComment(commentId:string,approved:boolean,postId:string){
    const r=await fetch("/api/feed/comments",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({comment_id:commentId,approved})});
    if(r.ok)setPosts(x=>x.map(p=>p.id===postId?{...p,comments:p.comments.map(c=>c.id===commentId?{...c,approved}:c)}:p));
    else{const d=await r.json();setMessage(d.error||"Não foi possível moderar.");}
  }

  async function deleteComment(commentId:string,postId:string){
    if(!window.confirm("Excluir comentário?"))return;
    const r=await fetch("/api/feed/comments?id="+encodeURIComponent(commentId),{method:"DELETE"});
    if(r.ok)setPosts(x=>x.map(p=>p.id===postId?{...p,comments:p.comments.filter(c=>c.id!==commentId)}:p));
  }

  async function report(post:Post){
    const reason=window.prompt("Motivo da denúncia");
    if(!reason?.trim())return;
    const r=await fetch("/api/feed/"+post.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"report",reason})});
    if(r.ok)setMessage("Denúncia registrada.");else setMessage("Não foi possível registrar a denúncia.");
  }

  return <main className="min-h-screen bg-neutral-50 px-4 pb-8 pt-24 sm:px-6"><SiteHeader />
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-500">← Dashboard</Link>
        <Link href="/dashboard/perfil" className="text-sm font-semibold">Meu perfil</Link>
      </div>
      <h1 className="mt-5 text-3xl font-bold">Feed</h1>
      <p className="mt-1 text-neutral-500">Compartilhe viagens, siga viajantes e descubra roteiros.</p>

      <form onSubmit={publish} className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
        <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título da publicação" className="w-full rounded-xl border p-3"/>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Conte sobre sua viagem..." rows={3} className="mt-3 w-full rounded-xl border p-3"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select value={tripId} onChange={e=>setTripId(e.target.value)} className="rounded-xl border p-3">
            <option value="">Sem viagem vinculada</option>
            {trips.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select value={visibility} onChange={e=>setVisibility(e.target.value)} className="rounded-xl border p-3">
            <option value="public">Público</option><option value="followers">Seguidores</option><option value="private">Somente eu</option>
          </select>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={async e=>{const files=Array.from(e.target.files||[]).slice(0,5);const compressed=await Promise.all(files.map(compressImage));setPendingImages(compressed);}} className="block w-full rounded-xl border p-2 text-sm"/>
        </div>
        {pendingImages.length>0&&<div className="mt-2"><p className="text-xs text-neutral-500">{pendingImages.length} foto{pendingImages.length===1?"":"s"} selecionada{pendingImages.length===1?"":"s"} · serão comprimidas antes do envio</p><div className="mt-2 grid grid-cols-5 gap-2">{pendingImages.map((image,index)=><div key={index} className="aspect-square overflow-hidden rounded-xl bg-neutral-100"><img src={URL.createObjectURL(image)} alt="" className="h-full w-full object-cover"/></div>)}</div></div>}
        <button className="mt-3 rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white">Publicar</button>
      </form>

      {message&&<p className="mt-3 rounded-xl bg-white p-3 text-sm text-neutral-600">{message}</p>}

      {loading?<p className="mt-6 text-sm text-neutral-500">Carregando feed...</p>:
        <div className="mt-6 space-y-4">{posts.map(p=>
          <article key={p.id} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
            {editing===p.id?
              <div className="space-y-3">
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full rounded-xl border p-3"/>
                <textarea value={editBody} onChange={e=>setEditBody(e.target.value)} rows={4} className="w-full rounded-xl border p-3"/>
                <select value={editVisibility} onChange={e=>setEditVisibility(e.target.value)} className="rounded-xl border p-3">
                  <option value="public">Público</option><option value="followers">Seguidores</option><option value="private">Somente eu</option>
                </select>
                <div className="flex gap-2"><button onClick={()=>saveEdit(p.id)} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Salvar</button><button onClick={()=>setEditing(null)} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button></div>
              </div>
              :
              <>
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{p.title}</h2>
                    <p className="text-xs text-neutral-400">{p.profiles?.username?<Link href={"/perfil/"+p.profiles.username} className="font-semibold hover:underline">{p.profiles.display_name||"Viajante"}</Link>:p.profiles?.display_name||"Viajante"} · {new Date(p.created_at).toLocaleString("pt-BR")} · {visibilityLabels[p.visibility]||p.visibility}</p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    {p.isMine&&<button onClick={()=>startEdit(p)} className="font-semibold">Editar</button>}
                    <button onClick={()=>report(p)} className="text-red-600">Denunciar</button>
                  </div>
                </div>
                {p.body&&<p className="mt-4 whitespace-pre-wrap text-neutral-700">{p.body}</p>}
                {p.media?.length>0&&<div className={"mt-4 grid gap-2 "+(p.media.length===1?"grid-cols-1":"grid-cols-2")}>{p.media.map((m,index)=><button key={m.id} type="button" onClick={()=>window.open(m.public_url,"_blank","noopener,noreferrer")} className={"overflow-hidden rounded-2xl bg-neutral-100 "+(p.media.length===3&&index===0?"col-span-2":"")}><img src={m.public_url} alt="" loading="lazy" decoding="async" className={"w-full object-cover "+(p.media.length===1?"max-h-[520px]":"h-56 sm:h-72")}/></button>)}</div>}
                <div className="mt-5 flex flex-wrap gap-4 text-sm">
                  <button onClick={()=>like(p)} className="font-semibold">{p.likedByMe?"Curtido":"Curtir"} · {p.likes}</button>
                  <button onClick={()=>comment(p)} className="font-semibold">Comentar · {p.comments.length}</button>
                  <button onClick={()=>bookmark(p)} className="font-semibold">{p.bookmarkedByMe?"Salvo":"Salvar"}</button>
                  {p.isMine&&<button onClick={()=>removePost(p.id)} className="text-red-600">Excluir</button>}
                  {p.trip_id&&<Link href={"/dashboard/trips/"+p.trip_id} className="font-semibold">Abrir viagem</Link>}
                </div>
                {p.comments.length>0&&<div className="mt-4 space-y-2 border-t pt-4">
                  {p.comments.map(c=><div key={c.id} className={"rounded-xl p-3 text-sm "+(c.approved?"bg-neutral-50":"border border-dashed bg-amber-50")}>
                    <div className="flex items-start justify-between gap-3">
                      <div><b>{c.profiles?.display_name||"Viajante"}</b><p className="mt-1">{c.body}</p>{!c.approved&&<span className="text-xs text-amber-700">Aguardando aprovação</span>}</div>
                      <div className="flex shrink-0 gap-2 text-xs">
                        {p.user_id===c.user_id&&<button onClick={()=>moderateComment(c.id,!c.approved,p.id)} className="font-semibold">{c.approved?"Ocultar":"Aprovar"}</button>}
                        <button onClick={()=>deleteComment(c.id,p.id)} className="text-red-600">Excluir</button>
                      </div>
                    </div>
                  </div>)}
                </div>}
      {!loading && hasMore && <button disabled={loadingMore} onClick={()=>load(false)} className="mt-6 w-full rounded-2xl border bg-white px-5 py-3 text-sm font-semibold shadow-sm disabled:opacity-50">{loadingMore ? "Carregando..." : "Carregar mais publicações"}</button>}
              </>
            }
          </article>
        )}</div>}
    </div>
  </main>;
}
