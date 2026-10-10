import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileActions from "./profile-actions";

function initials(name: string | null) {
  return (name || "Viajante").trim().slice(0, 1).toUpperCase();
}

function levelFor(score: number) {
  if (score >= 250) return { name: "Cartógrafo", next: 500 };
  if (score >= 100) return { name: "Explorador", next: 250 };
  if (score >= 30) return { name: "Viajante ativo", next: 100 };
  return { name: "Viajante", next: 30 };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const key = decodeURIComponent(username);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  const { data: profile } = await supabase.from("profiles")
    .select("display_name,username,bio,avatar_url")
    .eq(isUuid ? "id" : "username", isUuid ? key : key.toLowerCase()).maybeSingle();

  if (!profile) return { title: "Perfil não encontrado | NaBagagem" };
  const title = (profile.display_name || "Viajante") + " | NaBagagem";
  const description = profile.bio || "Viagens, destinos e histórias de " + (profile.display_name || "um viajante") + " no NaBagagem.";

  return {
    title,
    description,
    alternates: { canonical: "/perfil/" + (profile.username || key) },
    openGraph: { title, description, type: "profile", images: profile.avatar_url ? [profile.avatar_url] : [] },
    twitter: { card: "summary_large_image", title, description, images: profile.avatar_url ? [profile.avatar_url] : [] },
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const key = decodeURIComponent(username);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);

  const { data: profile } = await supabase.from("profiles")
    .select("id,display_name,username,avatar_url,bio,created_at")
    .eq(isUuid ? "id" : "username", isUuid ? key : key.toLowerCase()).maybeSingle();

  if (!profile) {
    return <main className="min-h-screen bg-[#f4f1ea] p-8"><h1 className="text-2xl font-black">Perfil não encontrado</h1></main>;
  }

  const [{ data: trips }, { data: interests }, { data: posts }, { count: followers }, { count: following }] = await Promise.all([
    supabase.from("trips").select("id,title,description,start_date,end_date,cover_url").eq("user_id", profile.id).eq("is_public", true).order("start_date", { ascending: false }),
    supabase.from("profile_interests").select("name,city,country").eq("user_id", profile.id).limit(18),
    supabase.from("feed_posts").select("id,title,body,created_at,trip_id").eq("user_id", profile.id).eq("visibility", "public").order("created_at", { ascending: false }).limit(12),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const postIds = (posts || []).map((p) => p.id);
  const tripIds = (trips || []).map((t) => t.id);
  const [{ data: media }, { data: locations }] = await Promise.all([
    postIds.length ? supabase.from("feed_post_media").select("id,post_id,public_url,created_at").in("post_id", postIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    tripIds.length ? supabase.from("trip_locations").select("city,country").in("trip_id", tripIds) : Promise.resolve({ data: [] }),
  ]);

  const gallery = (media || []).slice(0, 12);
  const countries = [...new Set((locations || []).map((x: any) => x.country).filter(Boolean))] as string[];
  const cities = [...new Set((locations || []).map((x: any) => [x.city, x.country].filter(Boolean).join(", ")).filter(Boolean))] as string[];

  const score = (trips || []).length * 20 + (posts || []).length * 8 + gallery.length * 4 + (interests || []).length * 2 + (followers || 0);
  const level = levelFor(score);
  const previous = score >= 250 ? 250 : score >= 100 ? 100 : score >= 30 ? 30 : 0;
  const progress = Math.min(100, Math.max(8, ((score - previous) / Math.max(1, level.next - previous)) * 100));
  const publicUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nabagagemweb.vercel.app") + "/perfil/" + (profile.username || key);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: (profile.display_name || "Viajante") + " no NaBagagem",
    description: profile.bio || "Perfil público de viajante no NaBagagem.",
    url: publicUrl,
    mainEntity: { "@type": "Person", name: profile.display_name || "Viajante", url: publicUrl, ...(profile.avatar_url ? { image: profile.avatar_url } : {}), ...(profile.username ? { alternateName: "@" + profile.username } : {}) },
  };

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 pb-20 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-bold text-neutral-500 hover:text-neutral-900">← NaBagagem</Link>
          <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-neutral-500">Passaporte digital</span>
        </div>

        <section className="nbg-fade-up relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-[#171717] text-white shadow-[0_30px_80px_rgba(0,0,0,.16)]">
          <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-[#d9d1c1]/20 blur-3xl" />
          <div className="relative grid gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="h-28 w-28 rounded-[2rem] object-cover ring-1 ring-white/20 shadow-2xl" alt={profile.display_name || "Foto de perfil"} />
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-white text-4xl font-black text-neutral-900 shadow-2xl">{initials(profile.display_name)}</div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{profile.display_name || "Viajante"}</h1>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">{level.name}</span>
                </div>
                {profile.username && <p className="mt-1 text-sm font-medium text-white/45">@{profile.username}</p>}
                {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{profile.bio}</p>}
                <ProfileActions username={profile.username || profile.id} />
              </div>
            </div>
            <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-xl">
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">Contribuição</p><p className="mt-1 text-3xl font-black">{score}</p></div>
                <p className="text-right text-xs text-white/45">próximo nível<br />{level.next}</p>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white" style={{ width: progress + "%" }} /></div>
              <p className="mt-2 text-[11px] leading-4 text-white/40">Roteiros, histórias, fotos e destinos publicados constroem sua presença no NaBagagem.</p>
            </div>
          </div>
          <div className="relative grid grid-cols-2 border-t border-white/10 sm:grid-cols-5">
            {[
              ["Viagens", (trips || []).length], ["Países", countries.length], ["Cidades", cities.length],
              ["Seguidores", followers || 0], ["Seguindo", following || 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">{label}</p><strong className="mt-1 block text-xl">{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-400">Bússola pessoal</p>
            <h2 className="mt-1 text-2xl font-black">Quero conhecer</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Destinos que ajudam o NaBagagem a encontrar roteiros e viajantes relevantes.</p>
            {(interests || []).length ? (
              <div className="mt-5 space-y-2">
                {(interests || []).map((interest: any) => (
                  <div key={interest.name + "-" + (interest.city || "")} className="flex items-center justify-between rounded-2xl bg-[#f5f2eb] px-4 py-3">
                    <span className="font-bold">{interest.name}</span>
                    <span className="text-xs text-neutral-400">{[interest.city, interest.country].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-5 rounded-2xl bg-[#f5f2eb] p-4 text-sm text-neutral-500">Nenhum interesse em destinos foi registrado ainda.</p>}
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-[#e5dfd2] p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500">Pegadas públicas</p><h2 className="mt-1 text-2xl font-black">Por onde passou</h2></div>
              <span className="text-sm font-semibold text-neutral-500">{cities.length} cidades · {countries.length} países</span>
            </div>
            {cities.length ? (
              <div className="mt-5 flex flex-wrap gap-2">{cities.slice(0, 24).map((city) => <span key={city} className="rounded-full border border-black/10 bg-white/65 px-4 py-2 text-sm font-semibold">{city}</span>)}</div>
            ) : <p className="mt-5 text-sm text-neutral-500">Os destinos públicos aparecerão aqui conforme os roteiros forem publicados.</p>}
          </div>
        </section>

        {gallery.length > 0 && (
          <section className="mt-8 nbg-fade-up">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-400">Diário visual</p><h2 className="mt-1 text-2xl font-black">Fragmentos de viagem</h2></div>
              <p className="max-w-sm text-right text-xs leading-5 text-neutral-400">Sem curtidas, sem contador. Apenas lugares que ficaram na memória.</p>
            </div>
            <div className={"travel-gallery " + (gallery.length === 1 ? "one" : gallery.length === 2 ? "two" : gallery.length === 3 ? "three" : "many")}>
              {gallery.map((item: any, index: number) => (
                <a key={item.id} href={item.public_url} target="_blank" rel="noreferrer" className="travel-gallery-item group">
                  <img src={item.public_url} alt={"Fragmento de viagem " + (index + 1)} loading={index < 3 ? "eager" : "lazy"} />
                  {index === 0 && gallery.length > 1 && <span className="travel-gallery-count">{gallery.length} registros</span>}
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-400">Cadernos publicados</p><h2 className="mt-1 text-2xl font-black">Roteiros de {profile.display_name || "viajante"}</h2></div>
              <span className="text-xs text-neutral-400">{trips?.length || 0} públicos</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(trips || []).map((trip: any) => (
                <Link key={trip.id} href={"/viagem/" + trip.id} className="group overflow-hidden rounded-2xl border bg-[#f8f7f3] transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  {trip.cover_url && <img src={trip.cover_url} alt="" className="h-32 w-full object-cover transition duration-500 group-hover:scale-[1.02]" />}
                  <div className="p-4"><h3 className="font-bold group-hover:underline">{trip.title}</h3>{trip.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{trip.description}</p>}</div>
                </Link>
              ))}
            </div>
            {!trips?.length && <p className="mt-4 rounded-2xl bg-[#f8f7f3] p-4 text-sm text-neutral-500">Ainda não há roteiros públicos.</p>}
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-400">Rastro recente</p><h2 className="mt-1 text-2xl font-black">Notas de viagem</h2>
            <div className="mt-4 space-y-3">
              {(posts || []).slice(0, 6).map((post: any) => (
                <Link key={post.id} href="/feed" className="block rounded-2xl bg-[#f8f7f3] p-4 transition hover:-translate-y-0.5 hover:bg-neutral-100">
                  <p className="text-xs text-neutral-400">{new Date(post.created_at).toLocaleDateString("pt-BR")}</p>
                  <h3 className="mt-1 font-bold">{post.title || "Uma nota de viagem"}</h3>
                  {post.body && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{post.body}</p>}
                </Link>
              ))}
            </div>
            {!posts?.length && <p className="mt-4 text-sm text-neutral-500">Ainda não há notas públicas.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
