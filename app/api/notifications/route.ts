import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const {data,error}=await supabase.from("notifications")
    .select("id,type,title,body,href,read_at,created_at")
    .eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({notifications:data||[],unread:(data||[]).filter(x=>!x.read_at).length});
}

export async function PATCH(request:Request) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const body=await request.json().catch(()=>({}));
  if(body.id) {
    const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",body.id).eq("user_id",user.id);
    if(error)return NextResponse.json({error:error.message},{status:400});
  } else {
    const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);
    if(error)return NextResponse.json({error:error.message},{status:400});
  }
  return NextResponse.json({ok:true});
}

export async function DELETE(request:Request) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const {searchParams}=new URL(request.url);
  const id=searchParams.get("id");
  const query=supabase.from("notifications").delete().eq("user_id",user.id);
  const {error}=id?await query.eq("id",id):await query;
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
