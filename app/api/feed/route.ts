import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") || "0"));
  const pageSize = Math.min(30, Math.max(5, Number(url.searchParams.get("pageSize") || "20")));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const {data:followingRows,error:followingError}=await supabase.from("user_follows").select("following_id").eq("follower_id",user.id);
  if(followingError)return NextResponse.json({error:followingError.message},{status:400});
  const followingIds=(followingRows||[]).map((x:any)=>x.following_id);
  const {data:followerRows,error:followerError}=await supabase.from("user_follows").select("follower_id").eq("following_id",user.id);
  if(followerError)return NextResponse.json({error:followerError.message},{status:400});
  const followerIds=new Set((followerRows||[]).map((x:any)=>x.follower_id));
  const followingSet=new Set(followingIds);
  const mutualSet=new Set(followingIds.filter((id:string)=>followerIds.has(id)));

  // Pull a larger recent window, then rank it so pagination does not bury discovery posts.
  const candidateSize=Math.min(100,Math.max(40,pageSize*4));
  const {data:posts,error}=await supabase.from("feed_posts")
    .select("id,user_id,trip_id,title,body,visibility,created_at,profiles(id,display_name,username,avatar_url),feed_likes(user_id),feed_comments(id,user_id,body,approved,created_at,profiles(display_name,username)),feed_bookmarks(user_id),feed_post_media(id,public_url,storage_path,created_at)")
    .order("created_at",{ascending:false}).range(0,candidateSize-1);

  if(error)return NextResponse.json({error:error.message},{status:400});

  const normalized=(posts||[]).map((p:any)=>{
    const isMine=p.user_id===user.id;
    const isFriend=mutualSet.has(p.user_id);
    const isFollowing=followingSet.has(p.user_id);
    const source=isMine?"mine":isFriend?"friends":isFollowing?"following":"discover";
    const rank=isMine?4:isFriend?3:isFollowing?2:1;
    return {
      ...p,
      isMine,
      feedSource:source,
      feedRank:rank,
      likes:(p.feed_likes||[]).length,
      likedByMe:(p.feed_likes||[]).some((x:any)=>x.user_id===user.id),
      comments:(p.feed_comments||[]).filter((x:any)=>x.approved||x.user_id===user.id||p.user_id===user.id),
      bookmarkedByMe:(p.feed_bookmarks||[]).some((x:any)=>x.user_id===user.id),
      media:p.feed_post_media||[]
    };
  }).sort((a:any,b:any)=>b.feedRank-a.feedRank||String(b.created_at).localeCompare(String(a.created_at)));
  const paged=normalized.slice(from,from+pageSize);
  return NextResponse.json({ posts:paged, page, pageSize, hasMore:normalized.length>from+pageSize || (posts||[]).length===candidateSize, sources:{friends:normalized.filter((p:any)=>p.feedSource==="friends").length,discover:normalized.filter((p:any)=>p.feedSource==="discover").length} });
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const body=await request.json();
  const title=String(body.title||"").trim();
  if(!title)return NextResponse.json({error:"Informe um título."},{status:400});
  const tripId=body.trip_id||null;
  if(tripId){
    const {data:trip}=await supabase.from("trips").select("id").eq("id",tripId).eq("user_id",user.id).maybeSingle();
    if(!trip)return NextResponse.json({error:"Viagem inválida."},{status:400});
  }
  const visibility=["public","followers","private"].includes(body.visibility)?body.visibility:"public";
  const {data,error}=await supabase.from("feed_posts").insert({
    user_id:user.id,trip_id:tripId,title,
    body:String(body.body||"").trim()||null,visibility
  }).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({post:data},{status:201});
}