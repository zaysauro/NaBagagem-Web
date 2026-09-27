import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./profile-actions";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const key = decodeURIComponent(username);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  const { data: profile } = await supabase.from("profiles").select("display_name,username,bio,avatar_url").eq(isUuid ? "id" : "username", isUuid ? key : key.toLowerCase()).maybeSingle();
  if (!profile) return { title: "Perfil não encontrado | NaBagagem" };
  const title = (profile.display_name || "Viajante") + " | NaBagagem";
  return { title, description: profile.bio || "Conheça viagens, destinos e histórias de " + (profile.display_name || "um viajante") + " no NaBagagem.", alternates: { canonical: "/perfil/" + (profile.username || key) }, openGraph: { title, description: profile.bio || "Viagens e histórias no NaBagagem.", images: profile.avatar_url ? [profile.avatar_url] : [] } };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const key = decodeURIComponent(username);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  const { data: profile } = await supabase.from("profiles").select("id,display_name,username,avatar_url,bio,created_at").eq(isUuid ? "id" : "username", isUuid ? key : key.toLowerCase()).maybeSingle();

  if (!profile) return <main className="min-h-screen bg-neutral-50 p-8"><h1 className="text-2xl font-bold">Perfil não encontrado</h1></main>;

  const [{ data: trips }, { data: interests }, { data: posts }, { count: followers }] = await Promise.all([
    supabase.from("trips").select("id,title,description,start_date,end_date,cover_url").eq("user_id", profile.id).eq("is_public", true).order("start_date", { ascending: false }),
    supabase.from("profile_interests").select("name,city,country").eq("user_id", profile.id).limit(12),
    supabase.from("feed_posts").select("id,title,body,created_at,trip_id").eq("user_id", profile.id).eq("visibility", "public").order("created_at", { ascending: false }).limit(12),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id)
  ]);
  const postIds=(posts||[]).map(p=>p.id);
  const { data: media }=postIds.length ? await supabase.from("feed_post_media").select("id,post_id,public_url,storage_path").in("post_id",postIds).order("created_at",{ascending:false}) : {data:[]};
  const scoreResult=await supabase.rpc("profile_contribution_score",{p_user_id:profile.id});
  const score=Number(scoreResult.data||0);
  const cities=[...new Set((await supabase.from("trip_locations").select("city,country").in("trip_id",(trips||[]).map(t=>t.id))).data?.map(x=>[x.city,x.country].filter(Boolean).join(", ")).filter(Boolean)||[])];
  const gallery=(media||[]).slice(0,12);
  const level=score>=250?"Cartógrafo":score>=100?"Explorador":score>=30?"Viajante ativo":"Viajante";

  return <main className="min-h-screen bg-[#f4f1ea] px-4 pb-16 pt-10 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="text-sm font-semibold text-neutral-500">← NaBagagem</Link>

      <section className="mt-5 overflow-hidden rounded-[2rem] border border-black/10 bg-[#171717] text-white shadow-xl">
        <div className="relative px-6 py-10 sm:px-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
            {profile.avatar_url ? <img src={profile.avatar_url} className="h-24 w-24 rounded-[1.75rem] object-cover ring-4 ring-white/10" alt="" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white text-3xl font-black text-neutral-900">{(profile.display_name||"U")[0].toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-tight">{profile.display_name||"Viajante"}</h1><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">{level}</span></div>
              {profile.username&&<p className="mt-1 text-white/60">@{profile.username}</p>}
              {profile.bio&&<p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{profile.bio}</p>}
              <ProfileActions username={profile.username||profile.id} />
            </div>
          </div>
          <div className="relative mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[["Viagens",(trips||[]).length],["Países",new Set((interests||[]).map(i=>i.country).filter(Boolean)).size],["Cidades",cities.length],["Seguidores",followers||0],["Contribuição",score]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[.16em] text-white/45">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}
          </div>
        </div>
      </section>

      {(interests||[]).length>0&&<section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Bússola pessoal</p><h2 className="mt-1 text-2xl font-black">Quero conhecer</h2></div><span className="text-sm text-neutral-400">{interests!.length} destinos</span></div><div className="mt-5 flex flex-wrap gap-2">{(interests||[]).map((i:any)=><span key={i.name+(i.city||"")} className="rounded-full bg-[#f4f1ea] px-4 py-2 text-sm font-semibold">{i.name}{i.city&&i.city!==i.name?<span className="ml-1 text-neutral-400">· {i.city}</span>:null}</span>)}</div></section>}

      {gallery.length>0&&<section className="mt-6"><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Fragmentos de viagem</p><h2 className="text-2xl font-black">Álbum público</h2></div><span className="text-sm text-neutral-400">sem curtidas, sem contador</span></div><div className="columns-2 gap-3 sm:columns-3 lg:columns-4">{gallery.map((m:any)=><a key={m.id} href={m.public_url} target="_blank" rel="noreferrer" className="mb-3 block break-inside-avoid overflow-hidden rounded-[1.5rem] bg-neutral-200 shadow-sm transition duration-500 hover:-translate-y-1 hover:rotate-[.4deg] hover:shadow-xl"><img src={m.public_url} alt="" loading="lazy" className="w-full object-cover transition duration-700 hover:scale-[1.03]" /></a>)}</div></section>}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Cadernos publicados</p><h2 className="mt-1 text-2xl font-black">Roteiros de {profile.display_name||"viajante"}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{(trips||[]).map(t=><Link key={t.id} href={"/viagem/"+t.id} className="group overflow-hidden rounded-2xl border bg-[#f8f7f3] p-4 transition hover:-translate-y-0.5 hover:shadow-md">{t.cover_url&&<img src={t.cover_url} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />}<h3 className="font-bold group-hover:underline">{t.title}</h3>{t.description&&<p className="mt-1 line-clamp-2 text-sm text-neutral-500">{t.description}</p>}</Link>)}</div>{!(trips||[]).length&&<p className="mt-4 text-sm text-neutral-500">Ainda não há roteiros públicos.</p>}</div>
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-neutral-400">Rastro recente</p><div className="mt-4 space-y-3">{(posts||[]).slice(0,6).map(p=><Link key={p.id} href="/feed" className="block rounded-2xl bg-[#f8f7f3] p-4 hover:bg-neutral-100"><p className="text-xs text-neutral-400">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p><h3 className="mt-1 font-bold">{p.title||"Uma nota de viagem"}</h3>{p.body&&<p className="mt-1 line-clamp-2 text-sm text-neutral-500">{p.body}</p>}</Link>)}</div></div>
      </section>
    </div>
  </main>;
}