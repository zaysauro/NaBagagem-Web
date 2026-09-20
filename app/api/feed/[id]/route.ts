import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function auth(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 return {supabase,user};
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params; const {supabase,user}=await auth();
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 const body=await request.json(); const action=String(body.action||"");
 if(action==="like"){
  const {error}=await supabase.from("feed_likes").upsert({post_id:id,user_id:user.id});
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({liked:true});
 }
 if(action==="unlike"){
  const {error}=await supabase.from("feed_likes").delete().eq("post_id",id).eq("user_id",user.id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({liked:false});
 }
 if(action==="comment"){
  const text=String(body.body||"").trim();
  if(!text)return NextResponse.json({error:"Comentário vazio."},{status:400});
  const {data,error}=await supabase.from("feed_comments").insert({post_id:id,user_id:user.id,body:text}).select("id,user_id,body,approved,created_at").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({comment:data},{status:201});
 }
 if(action==="report"){
  const reason=String(body.reason||"").trim();
  if(!reason)return NextResponse.json({error:"Informe o motivo da denúncia."},{status:400});
  const {error}=await supabase.from("feed_reports").upsert({post_id:id,user_id:user.id,reason});
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({reported:true});
 }
 return NextResponse.json({error:"Ação inválida."},{status:400});
}