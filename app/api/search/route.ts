import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [], posts: [], destinations: [] });
  if (q.length > 80) return NextResponse.json({ error: "Busca muito longa." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const pattern = "%" + q.replace(/[%_]/g, "") + "%";

  // Nome e @username são buscas parciais. E-mail é aceito como correspondência exata,
  // mas nunca é devolvido ao navegador.
  const { data: rpcUsers, error: rpcError } = await supabase.rpc("search_profiles", {
    search_term: q,
  });

  // Fallback para instalações em que a nova função SQL ainda não foi aplicada.
  const { data: profileUsers, error: profileError } = rpcError
    ? await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url,bio")
        .or("username.ilike." + pattern + ",display_name.ilike." + pattern)
        .limit(20)
    : { data: null, error: null };

  const users = rpcError ? profileUsers || [] : rpcUsers || [];

  if (rpcError && profileError && !users.length) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Estado da relação social para permitir seguir diretamente no resultado.
  let usersWithFollowState = users;

  if (users.length) {
    const ids = users.map((item) => item.id);
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

    usersWithFollowState = users.map((item) => ({
      ...item,
      isFollowing: followingSet.has(item.id),
      followsMe: followsMeSet.has(item.id),
    }));
  }

  // Feed e destinos são complementares: se uma tabela social ainda não estiver
  // disponível, a busca de pessoas continua funcionando.
  const { data: posts } = await supabase
    .from("feed_posts")
    .select("id,user_id,trip_id,title,body,visibility,created_at,profiles(id,display_name,username,avatar_url),feed_post_media(id,public_url)")
    .or("title.ilike." + pattern + ",body.ilike." + pattern)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: locations } = await supabase
    .from("trip_locations")
    .select("id,trip_id,name,city,country,latitude,longitude,trips!inner(id,title,user_id)")
    .or("name.ilike." + pattern + ",city.ilike." + pattern + ",country.ilike." + pattern)
    .limit(30);

  return NextResponse.json({
    users: usersWithFollowState,
    posts: posts || [],
    destinations: locations || [],
  });
}
