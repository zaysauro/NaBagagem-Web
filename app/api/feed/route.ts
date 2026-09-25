import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") || "0"));
  const pageSize = Math.min(30, Math.max(5, Number(url.searchParams.get("pageSize") || "20")));
  const sourceFilter = String(url.searchParams.get("source") || "all");
  const from = page * pageSize;
  const { data: followingRows, error: followingError } = await supabase.from("user_follows").select("following_id").eq("follower_id", user.id);
  if (followingError) return NextResponse.json({ error: followingError.message }, { status: 400 });
  const followingIds = (followingRows || []).map((x: any) => x.following_id);
  const { data: followerRows, error: followerError } = await supabase.from("user_follows").select("follower_id").eq("following_id", user.id);
  if (followerError) return NextResponse.json({ error: followerError.message }, { status: 400 });
  const followerIds = new Set((followerRows || []).map((x: any) => x.follower_id));
  const followingSet = new Set(followingIds);
  const mutualSet = new Set(followingIds.filter((id: string) => followerIds.has(id)));
  const candidateSize = Math.min(100, Math.max(40, pageSize * 4));
  const { data: posts, error } = await supabase.from("feed_posts").select("id,user_id,trip_id,title,body,visibility,created_at").order("created_at", { ascending: false }).range(0, candidateSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const postIds = (posts || []).map((p: any) => p.id);
  const userIds = [...new Set((posts || []).map((p: any) => p.user_id))];
  const [profilesResult, likesResult, commentsResult, bookmarksResult, mediaResult] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from("feed_likes").select("post_id,user_id").in("post_id", postIds) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from("feed_comments").select("id,post_id,user_id,body,approved,created_at").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from("feed_bookmarks").select("post_id,user_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from("feed_post_media").select("id,post_id,public_url,storage_path,created_at").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null }),
  ]);
  const queryErrors = [profilesResult.error, likesResult.error, commentsResult.error, bookmarksResult.error, mediaResult.error].filter(Boolean);
  if (queryErrors.length) return NextResponse.json({ error: queryErrors[0]?.message || "Erro ao carregar o feed." }, { status: 400 });
  const profiles = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
  const likesByPost = new Map<string, any[]>();
  for (const like of likesResult.data || []) { const list = likesByPost.get(like.post_id) || []; list.push(like); likesByPost.set(like.post_id, list); }
  const commentsByPost = new Map<string, any[]>();
  for (const comment of commentsResult.data || []) { const list = commentsByPost.get(comment.post_id) || []; list.push(comment); commentsByPost.set(comment.post_id, list); }
  const bookmarks = new Set((bookmarksResult.data || []).map((x: any) => x.post_id));
  const mediaByPost = new Map<string, any[]>();
  for (const media of mediaResult.data || []) { const list = mediaByPost.get(media.post_id) || []; list.push(media); mediaByPost.set(media.post_id, list); }
  const normalized = (posts || []).map((p: any) => {
    const isMine = p.user_id === user.id;
    const isFriend = mutualSet.has(p.user_id);
    const isFollowing = followingSet.has(p.user_id);
    const source = isMine ? "mine" : isFriend ? "friends" : isFollowing ? "following" : "discover";
    const rank = isMine ? 4 : isFriend ? 3 : isFollowing ? 2 : 1;
    const postComments = commentsByPost.get(p.id) || [];
    return { ...p, profiles: profiles.get(p.user_id) || null, isMine, feedSource: source, feedRank: rank, likes: (likesByPost.get(p.id) || []).length, likedByMe: (likesByPost.get(p.id) || []).some((x: any) => x.user_id === user.id), comments: postComments.filter((x: any) => x.approved || x.user_id === user.id || p.user_id === user.id).map((x: any) => ({ ...x, profiles: profiles.get(x.user_id) || null })), bookmarkedByMe: bookmarks.has(p.id), media: mediaByPost.get(p.id) || [] };
  }).sort((a: any, b: any) => b.feedRank - a.feedRank || String(b.created_at).localeCompare(String(a.created_at)));
  const filtered = sourceFilter === "all" ? normalized : normalized.filter((p: any) => p.feedSource === sourceFilter || (sourceFilter === "friends" && p.feedSource === "mine"));
  const paged = filtered.slice(from, from + pageSize);
  return NextResponse.json({ posts: paged, page, pageSize, hasMore: filtered.length > from + pageSize || (posts || []).length === candidateSize, source: sourceFilter, sources: { friends: normalized.filter((p: any) => p.feedSource === "friends").length, following: normalized.filter((p: any) => p.feedSource === "following").length, discover: normalized.filter((p: any) => p.feedSource === "discover").length } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json();
  const requestedTitle = String(body.title || "").trim();
  const postBody = String(body.body || "").trim();
  const title = requestedTitle || postBody.split(/\\r?\\n/).find((line: string) => line.trim())?.trim().slice(0, 80) || "Nova publicação";
  if (!postBody && !requestedTitle) return NextResponse.json({ error: "Escreva algo para publicar." }, { status: 400 });
  const tripId = body.trip_id || null;
  if (tripId) { const { data: trip } = await supabase.from("trips").select("id").eq("id", tripId).eq("user_id", user.id).maybeSingle(); if (!trip) return NextResponse.json({ error: "Viagem inválida." }, { status: 400 }); }
  const visibility = ["public", "followers", "private"].includes(body.visibility) ? body.visibility : "public";
  const { data, error } = await supabase.from("feed_posts").insert({ user_id: user.id, trip_id: tripId, title, body: postBody || null, visibility }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data }, { status: 201 });
}
