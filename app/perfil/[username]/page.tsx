import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./profile-actions";

export default async function PublicProfile({params}:{params:Promise<{username:string}>}) {
  const {username}=await params;
  const supabase=await createClient();
  const {data:profile}=await supabase.from("profiles").select("id,display_name,username,avatar_url,bio").eq("username",username).maybeSingle();
  if(!profile)return <main className="p-8"><h1 className="text-2xl font-bold">Perfil não encontrado</h1></main>;
  const {data:stats}=await supabase.from("travel_stats").select("is_public").eq("user_id",profile.id).maybeSingle();
  if(stats?.is_public===false)return <main className="min-h-screen bg-neutral-50 p-8"><div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8"><h1 className="text-2xl font-bold">Perfil privado</h1><p className="mt-2 text-neutral-500">Este viajante optou por não publicar suas estatísticas.</p></div></main>;
  const {data:trips}=await supabase.from("trips").select("id,title,description,start_date,end_date").eq("user_id",profile.id).order("start_date",{ascending:false});
  const ids=(trips||[]).map(t=>t.id);
  const {data:locs}=ids.length?await supabase.from("trip_locations").select("city,country,latitude,longitude").in("trip_id",ids):{data:[]};
  const countries=[...new Set((locs||[]).map(x=>x.country).filter(Boolean))];
  return <main className="min-h-screen bg-neutral-50 px-6 py-10"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="text-sm font-semibold text-neutral-500">← NaBagagem</Link>
    <section className="mt-5 rounded-3xl border bg-white p-7 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {profile.avatar_url?<img src={profile.avatar_url} className="h-20 w-20 rounded-full object-cover"/>:<div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-950 text-2xl font-bold text-white">{(profile.display_name||"U")[0]}</div>}
      <div><h1 className="text-3xl font-bold">{profile.display_name||"Viajante"}</h1><p className="text-neutral-500">@{profile.username}</p>{profile.bio&&<p className="mt-2 text-neutral-600">{profile.bio}</p>}<ProfileActions username={profile.username}/></div>
    </div></section>
    <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><b className="text-2xl">{trips?.length||0}</b><p className="text-sm text-neutral-500">viagens</p></div><div className="rounded-2xl border bg-white p-5"><b className="text-2xl">{countries.length}</b><p className="text-sm text-neutral-500">países</p></div><div className="rounded-2xl border bg-white p-5"><b className="text-2xl">{new Set((locs||[]).map(x=>[x.city,x.country].filter(Boolean).join(", "))).size}</b><p className="text-sm text-neutral-500">cidades</p></div></section>
    <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Viagens publicadas</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{(trips||[]).map(t=><div key={t.id} className="rounded-2xl bg-neutral-50 p-4"><b>{t.title}</b>{t.description&&<p className="mt-1 text-sm text-neutral-600">{t.description}</p>}</div>)}</div></section>
  </div></main>;
}