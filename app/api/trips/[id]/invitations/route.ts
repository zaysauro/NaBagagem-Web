import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 try {
  const {id}=await params;const body=await request.json();const email=String(body.email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!["editor","viewer"].includes(body.role))return NextResponse.json({error:"Confira o e-mail e a permissão."},{status:400});
  const token=randomBytes(32).toString("hex");const hash=createHash("sha256").update(token).digest("hex");
  await query("insert into trip_invitations(trip_id,invited_by,email,role,token_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '7 days')",[id,user.id,email,body.role,hash]);
  return NextResponse.json({url:`${new URL(request.url).origin}/convite?token=${token}`,expires_in_days:7},{status:201});
 }catch{return NextResponse.json({error:"Não foi possível criar o convite. Apenas o proprietário pode convidar."},{status:400});}
}
