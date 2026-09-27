import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: interests } = await supabase.from("profile_interests").select("name,city,country,latitude,longitude").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12);
  const countries = [...new Set((interests || []).map(i => i.country).filter(Boolean))];
  const cities = [...new Set((interests || []).map(i => i.city).filter(Boolean))];

  let locations: any[] = [];
  if (countries.length || cities.length) {
    const parts = [
      ...countries.map(c => "country.ilike.%" + String(c).replace(/[%_]/g, "") + "%"),
      ...cities.map(c => "city.ilike.%" + String(c).replace(/[%_]/g, "") + "%")
    ];
    const { data } = await supabase.from("trip_locations").select("id,trip_id,name,city,country,latitude,longitude").or(parts.join(",")).limit(80);
    locations = data || [];
  }

  const tripIds = [...new Set(locations.map(l => l.trip_id).filter(Boolean))];
  const { data: trips } = tripIds.length
    ? await supabase.from("trips").select("id,user_id,title,description,start_date,end_date,cover_url,is_public,created_at").in("id", tripIds).eq("is_public", true)
    : { data: [] };

  const tripLocationMap = new Map<string, any[]>();
  for (const loc of locations) tripLocationMap.set(loc.trip_id, [...(tripLocationMap.get(loc.trip_id) || []), loc]);

  const candidateUserIds = [...new Set((trips || []).map(t => t.user_id).filter(id => id !== user.id))];
  const { data: profiles } = candidateUserIds.length ? await supabase.from("profiles").select("id,display_name,username,avatar_url,bio").in("id", candidateUserIds) : { data: [] };
  const { data: follows } = candidateUserIds.length ? await supabase.from("user_follows").select("following_id").eq("follower_id", user.id).in("following_id", candidateUserIds) : { data: [] };
  const following = new Set((follows || []).map(f => f.following_id));
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  const suggestions = (trips || []).map(trip => {
    const matched = tripLocationMap.get(trip.id) || [];
    const author = profileMap.get(trip.user_id) || null;
    return { trip, author, locations: matched.slice(0, 6), matchedInterest: matched[0] ? [matched[0].city, matched[0].country].filter(Boolean).join(", ") : "Destino relacionado", isFollowing: following.has(trip.user_id) };
  }).sort((a,b) => (b.locations.length - a.locations.length) || (new Date(b.trip.created_at || 0).getTime() - new Date(a.trip.created_at || 0).getTime())).slice(0, 24);

  const travelers = candidateUserIds.map(id => ({ profile: profileMap.get(id), isFollowing: following.has(id), trips: (trips || []).filter(t => t.user_id === id).length })).filter(x => x.profile).sort((a,b) => b.trips - a.trips).slice(0, 12);
  return NextResponse.json({ interests: interests || [], suggestions, travelers });
}
