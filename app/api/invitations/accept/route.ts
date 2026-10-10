import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";
export async function POST(request:Request){
 if(!await getCurrentUser())return NextResponse.json({error:"Entre com o e-mail que recebeu o convite."},{status:401});
 try{const body=await request.json();if(!/^[a-f0-9]{64}$/.test(body.token))return NextResponse.json({error:"Convite inválido."},{status:400});
 const hash=createHash("sha256").update(body.token).digest("hex");const result=await query("select app_private.accept_invitation($1) as trip_id",[hash]);return NextResponse.json(result.rows[0]);
 }catch{return NextResponse.json({error:"Convite expirado, já utilizado ou destinado a outro e-mail."},{status:400});}
}
