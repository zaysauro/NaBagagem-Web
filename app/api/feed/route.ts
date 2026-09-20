import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:posts,error}=await supabase.from("feed_posts")
    .select("id,user_id,trip_id,title,body,visibility,created_at,profiles(id,display_name,username,avatar_url),feed_likes(user_id),feed_comments(id,user_id,body,approved,created_at,profiles(display_name,username)),feed_bookmarks(user_id),feed_post_media(id,public_url,storage_path,created_at)")
    .order("created_at",{ascending:false}).limit(50);

  if(error)return NextResponse.json({error:error.message},{status:400});

  const normalized=(posts||[]).map((p:any)=>({
    ...p,
    isMine:p.user_id===user.id,
    likes:(p.feed_likes||[]).length,
    likedByMe:(p.feed_likes||[]).some((x:any)=>x.user_id===user.id),
    comments:(p.feed_comments||[]).filter((x:any)=>x.approved||x.user_id===user.id||p.user_id===user.id),
    bookmarkedByMe:(p.feed_bookmarks||[]).some((x:any)=>x.user_id===user.id),
    media:p.feed_post_media||[]
  }));
  return NextResponse.json({posts:normalized});
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