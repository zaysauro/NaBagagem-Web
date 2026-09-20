import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:bookmarks,error}=await supabase.from("feed_bookmarks")
    .select("created_at,feed_posts(id,user_id,trip_id,title,body,visibility,created_at,profiles(id,display_name,username,avatar_url),feed_post_media(id,public_url,storage_path,created_at))")
    .eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);

  if(error)return NextResponse.json({error:error.message},{status:400});
  const posts=(bookmarks||[]).map((item:any)=>({...item.feed_posts,media:item.feed_posts?.feed_post_media||[],bookmarkedByMe:true}));
  return NextResponse.json({posts});
}
