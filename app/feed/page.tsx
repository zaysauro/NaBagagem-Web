"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Media = { id: string; public_url: string };
type Post = {
  id: string; title: string; body: string | null; created_at: string; trip_id: string | null;
  likedByMe: boolean; likes: number; comments: any[]; profiles: any; media: Media[];
};

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/feed");
    const d = await r.json();
    if (r.ok) setPosts(d.posts || []);
    else setMessage(d.error || "Não foi possível carregar o feed.");
    setLoading(false);
  }

  useEffect(() => {
    load();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createClient();
    const channel = supabase.channel("na-bagagem-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_likes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_comments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const r = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, visibility: "public" })
    });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Erro ao publicar."); return; }

    let newPost = { ...d.post, likes: 0, likedByMe: false, comments: [], profiles: null, media: [] };
    if (pendingImage) {
      const form = new FormData();
      form.append("post_id", d.post.id);
      form.append("file", pendingImage);
      const upload = await fetch("/api/feed/upload", { method: "POST", body: form });
      if (!upload.ok) {
        const error = await upload.json();
        setMessage("Publicação criada, mas a imagem não foi enviada: " + (error.error || "erro"));
      }
    }
    setTitle("");
    setBody("");
    setPendingImage(null);
    if (fileRef.current) fileRef.current.value = "";
    setPosts(x => [newPost, ...x]);
    await load();
  }

  async function like(post: Post) {
    const action = post.likedByMe ? "unlike" : "like";
    const r = await fetch("/api/feed/" + post.id, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (r.ok) setPosts(x => x.map(p => p.id === post.id ? {
      ...p, likedByMe: !post.likedByMe, likes: p.likes + (post.likedByMe ? -1 : 1)
    } : p));
  }

  async function comment(post: Post) {
    const text = window.prompt("Comentário");
    if (!text?.trim()) return;
    const r = await fetch("/api/feed/" + post.id, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", body: text })
    });
    const d = await r.json();
    if (r.ok) setPosts(x => x.map(p => p.id === post.id ? { ...p, comments: [...p.comments, d.comment] } : p));
  }

  async function report(post: Post) {
    const reason = window.prompt("Motivo da denúncia");
    if (!reason?.trim()) return;
    const r = await fetch("/api/feed/" + post.id, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", reason })
    });
    if (r.ok) setMessage("Denúncia registrada.");
  }

  return <main className="min-h-screen bg-neutral-50 px-6 py-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm font-semibold text-neutral-500">← Dashboard</Link>
      <h1 className="mt-5 text-3xl font-bold">Feed</h1>
      <p className="mt-1 text-neutral-500">Compartilhe viagens e descubra roteiros.</p>

      <form onSubmit={publish} className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
        <input required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Título da publicação" className="w-full rounded-xl border p-3" />
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Conte sobre sua viagem..." rows={3} className="mt-3 w-full rounded-xl border p-3" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={e => setPendingImage(e.target.files?.[0] || null)}
            className="block w-full text-sm" />
          <button className="rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white">Publicar</button>
        </div>
      </form>

      {message && <p className="mt-3 text-sm text-neutral-600">{message}</p>}
      {loading ? <p className="mt-6 text-sm text-neutral-500">Carregando feed...</p> :
        <div className="mt-6 space-y-4">{posts.map(p =>
          <article key={p.id} className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex justify-between gap-4">
              <div><h2 className="text-lg font-bold">{p.title}</h2>
                <p className="text-xs text-neutral-400">{p.profiles?.display_name || "Viajante"} · {new Date(p.created_at).toLocaleString("pt-BR")}</p>
              </div>
              {p.trip_id && <Link href={"/dashboard/trips/" + p.trip_id} className="text-xs font-semibold">Abrir viagem</Link>}
            </div>
            {p.body && <p className="mt-4 whitespace-pre-wrap text-neutral-700">{p.body}</p>}
            {p.media?.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {p.media.map(m => <img key={m.id} src={m.public_url} alt="" className="max-h-80 w-full rounded-2xl object-cover" />)}
            </div>}
            <div className="mt-5 flex gap-4 text-sm">
              <button onClick={() => like(p)} className="font-semibold">{p.likedByMe ? "Curtido" : "Curtir"} · {p.likes}</button>
              <button onClick={() => comment(p)} className="font-semibold">Comentar · {p.comments.length}</button>
              <button onClick={() => report(p)} className="text-red-600">Denunciar</button>
            </div>
            {p.comments.length > 0 && <div className="mt-4 space-y-2 border-t pt-4">
              {p.comments.map(c => <div key={c.id} className="rounded-xl bg-neutral-50 p-3 text-sm">
                <b>{c.profiles?.display_name || "Viajante"}</b><p>{c.body}</p>
              </div>)}
            </div>}
          </article>
        )}</div>}
    </div>
  </main>;
}
