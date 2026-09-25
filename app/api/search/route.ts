import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SearchUser = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [], posts: [], destinations: [] });
  if (q.length > 80) return NextResponse.json({ error: "Busca muito longa." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const normalizedQuery = q.replace(/^@+/, "").trim();
  const safeQuery = normalizedQuery.replace(/[%_]/g, "");
  const pattern = "%" + safeQuery + "%";

  // Nome e @username são buscas parciais. E-mail é aceito como correspondência exata,
  // mas nunca é devolvido ao navegador.
  const { data: rpcUsers, error: rpcError } = await supabase.rpc("search_profiles", {
    search_term: normalizedQuery,
  });

  // Fallback para instalações em que a nova função SQL ainda não foi aplicada.
  const { data: profileUsers, error: profileError } = rpcError
    ? await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url,bio")
        .or("username.ilike." + pattern + ",display_name.ilike." + pattern)
        .limit(20)
    : { data: null, error: null };

  let users: SearchUser[] = (rpcError ? profileUsers || [] : rpcUsers || []) as SearchUser[];

  // Se a função RPC existir mas ainda não enxergar perfis (por exemplo, após uma
  // migração parcial), tenta diretamente a tabela pública de perfis.
  if (!users.length && !profileUsers) {
    const { data: fallbackUsers } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url,bio")
      .or("username.ilike." + pattern + ",display_name.ilike." + pattern)
      .limit(20);
    users = (fallbackUsers || []) as SearchUser[];
  }

  if (rpcError && profileError && !users.length) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Estado da relação social para permitir seguir diretamente no resultado.
  let usersWithFollowState: Array<SearchUser & {
    isFollowing: boolean;
    followsMe: boolean;
  }> = [];

  if (users.length) {
    const ids = users.map((item: SearchUser) => item.id);

    const [{ data: outgoing }, { data: incoming }] = await Promise.all([
      supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", ids),
      supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .in("follower_id", ids),
    ]);

    const followingSet = new Set((outgoing || []).map((row) => row.following_id));
    const followsMeSet = new Set((incoming || []).map((row) => row.follower_id));

    usersWithFollowState = users.map((item: SearchUser) => ({
      ...item,
      isFollowing: followingSet.has(item.id),
      followsMe: followsMeSet.has(item.id),
    }));
  }

  // Feed e destinos são complementares: se uma tabela social ainda não estiver
  // disponível, a busca de pessoas continua funcionando.
  const { data: rawPosts } = await supabase
    .from("feed_posts")
    .select("id,user_id,trip_id,title,body,visibility,created_at")
    .or("title.ilike." + pattern + ",body.ilike." + pattern)
    .order("created_at", { ascending: false })
    .limit(30);

  const postUserIds = [...new Set((rawPosts || []).map((p: any) => p.user_id))];
  const { data: postProfiles } = postUserIds.length
    ? await supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", postUserIds)
    : { data: [] };
  const profileMap = new Map((postProfiles || []).map((p: any) => [p.id, p]));
  const posts = (rawPosts || []).map((p: any) => ({ ...p, profiles: profileMap.get(p.user_id) || null }));

  const { data: rawLocations } = await supabase
    .from("trip_locations")
    .select("id,trip_id,name,city,country,latitude,longitude")
    .or("name.ilike." + pattern + ",city.ilike." + pattern + ",country.ilike." + pattern)
    .limit(30);

  const tripIds = [...new Set((rawLocations || []).map((l: any) => l.trip_id).filter(Boolean))];
  const { data: locationTrips } = tripIds.length
    ? await supabase.from("trips").select("id,title,user_id").in("id", tripIds)
    : { data: [] };
  const tripMap = new Map((locationTrips || []).map((t: any) => [t.id, t]));
  const destinations = (rawLocations || []).map((l: any) => ({ ...l, trips: tripMap.get(l.trip_id) || null }));

  return NextResponse.json({
    users: usersWithFollowState,
    posts,
    destinations,
  });
}
