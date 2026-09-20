import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request:Request){
  const q=new URL(request.url).searchParams.get("q")?.trim();
  if(!q)return NextResponse.json({users:[],posts:[],destinations:[]});
  if(q.length>80)return NextResponse.json({error:"Busca muito longa."},{status:400});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const pattern="%"+q.replace(/[%_]/g,"")+"%";

  const [{data:users,error:userError},{data:posts,error:postError},{data:locations,error:locationError}]=await Promise.all([
    supabase.from("profiles").select("id,display_name,username,avatar_url,bio").or("username.ilike."+pattern+",display_name.ilike."+pattern).limit(20),
    supabase.from("feed_posts").select("id,user_id,trip_id,title,body,visibility,created_at,profiles(id,display_name,username,avatar_url),feed_post_media(id,public_url)").or("title.ilike."+pattern+",body.ilike."+pattern).order("created_at",{ascending:false}).limit(30),
    supabase.from("trip_locations").select("id,trip_id,name,city,country,latitude,longitude,trips!inner(id,title,user_id)").or("name.ilike."+pattern+",city.ilike."+pattern+",country.ilike."+pattern).limit(30)
  ]);
  if(userError||postError||locationError)return NextResponse.json({error:userError?.message||postError?.message||locationError?.message||"Erro na busca."},{status:400});
  return NextResponse.json({users:users||[],posts:(posts||[]).map((p:any)=>({...p,media:p.feed_post_media||[]})),destinations:locations||[]});
}
