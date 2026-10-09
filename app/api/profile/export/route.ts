import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { transaction } from "@/lib/neon/db";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 try{
  const data=await transaction(async client=>{
   const result:Record<string,unknown>={exported_at:new Date().toISOString(),account:{id:user.id,email:user.email}};
   for(const table of ["profiles","trips","profile_interests","profile_visited_countries","notification_preferences","trip_templates","feed_posts","feed_comments"]){const column=table==="profiles"?"id":"user_id";result[table]=(await client.query(`select * from ${table} where ${column}=$1`,[user.id])).rows;}
   for(const table of ["trip_locations","trip_events","trip_expenses","trip_checklist_items","packing_lists"]){result[table]=(await client.query(`select * from ${table} where trip_id in (select id from trips where user_id=$1)`,[user.id])).rows;}
   result.packing_items=(await client.query("select i.* from packing_items i join packing_lists l on l.id=i.list_id join trips t on t.id=l.trip_id where t.user_id=$1",[user.id])).rows;
   return result;
  });
  return NextResponse.json(data,{headers:{"Content-Disposition":"attachment; filename=nabagagem-dados.json","Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível exportar seus dados."},{status:500});}
}
