import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function auth(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return {supabase,user};
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user}=await auth();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const body=await request.json();
  const action=String(body.action||"");

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
    const {data:post}=await supabase.from("feed_posts").select("id").eq("id",id).maybeSingle();
    if(!post)return NextResponse.json({error:"Publicação não encontrada."},{status:404});
    const {data,error}=await supabase.from("feed_comments").insert({
      post_id:id,user_id:user.id,body:text,approved:false
    }).select("id,user_id,body,approved,created_at").single();
    if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({comment:data,pending:true},{status:201});
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

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user}=await auth();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const body=await request.json();
  const {data:post,error:readError}=await supabase.from("feed_posts").select("id,user_id").eq("id",id).maybeSingle();
  if(readError)return NextResponse.json({error:readError.message},{status:400});
  if(!post)return NextResponse.json({error:"Publicação não encontrada."},{status:404});
  if(post.user_id!==user.id)return NextResponse.json({error:"Sem permissão."},{status:403});

  const patch:any={};
  if(body.title!==undefined){
    const title=String(body.title).trim();
    if(!title)return NextResponse.json({error:"O título não pode ficar vazio."},{status:400});
    patch.title=title;
  }
  if(body.body!==undefined)patch.body=String(body.body||"").trim()||null;
  if(body.visibility!==undefined && ["public","followers","private"].includes(body.visibility))patch.visibility=body.visibility;
  if(!Object.keys(patch).length)return NextResponse.json({error:"Nenhuma alteração enviada."},{status:400});

  const {data,error}=await supabase.from("feed_posts").update(patch).eq("id",id).select().single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({post:data});
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user}=await auth();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const {data:post}=await supabase.from("feed_posts").select("id,user_id").eq("id",id).maybeSingle();
  if(!post)return NextResponse.json({error:"Publicação não encontrada."},{status:404});
  if(post.user_id!==user.id)return NextResponse.json({error:"Sem permissão."},{status:403});
  const {error}=await supabase.from("feed_posts").delete().eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({deleted:true});
}