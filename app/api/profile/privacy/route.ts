import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const body=await request.json();
  const is_public=Boolean(body.is_public);
  const {error}=await supabase.from("travel_stats").upsert({user_id:user.id,is_public,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({is_public});
}
