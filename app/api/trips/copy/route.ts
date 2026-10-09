import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { transaction } from "@/lib/neon/db";
export async function POST(request: Request) {
 const user = await getCurrentUser();
 if (!user) return NextResponse.json({ error: "Faça login para copiar a viagem." }, { status: 401 });
 try {
  const body = await request.json(); const token = typeof body.token === "string" ? body.token : "";
  const copy = await transaction(async client => {
   const source = await client.query("select id,title,description,start_date,end_date from trips where ($1::uuid is not null and id=$1 and (user_id::text=$3 or is_public)) or ($2<>'' and share_token=$2)", [body.trip_id || null,token,user.id]);
   if (!source.rows[0]) return null;
   const trip = source.rows[0];
   const created = await client.query("insert into trips(user_id,title,description,start_date,end_date,source_trip_id) values($1,$2,$3,$4,$5,$6) returning id",[user.id,`${trip.title.slice(0,110)} (cópia)`,trip.description,trip.start_date,trip.end_date,trip.id]);
   const newId = created.rows[0].id; const locations = await client.query("select id,name,city,country,latitude,longitude,order_index from trip_locations where trip_id=$1 order by order_index",[trip.id]);
   const mapping = new Map<string,string>();
   for (const location of locations.rows) {
    const inserted = await client.query("insert into trip_locations(trip_id,name,city,country,latitude,longitude,order_index) values($1,$2,$3,$4,$5,$6,$7) returning id",[newId,location.name,location.city,location.country,location.latitude,location.longitude,location.order_index]);
    mapping.set(location.id,inserted.rows[0].id);
   }
   const events = await client.query("select title,event_date,start_time,end_time,location_id,day_index,color,order_index,activity_type from trip_events where trip_id=$1 order by day_index,order_index",[trip.id]);
   for (const e of events.rows) await client.query("insert into trip_events(trip_id,title,event_date,start_time,end_time,location_id,day_index,color,order_index,activity_type) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[newId,e.title,e.event_date,e.start_time,e.end_time,mapping.get(e.location_id)||null,e.day_index,e.color,e.order_index,e.activity_type]);
   return newId;
  },token);
  return copy ? NextResponse.json({ trip_id: copy },{ status: 201 }) : NextResponse.json({error:"Viagem não encontrada."},{status:404});
 } catch { return NextResponse.json({ error: "Não foi possível copiar a viagem." },{status:400}); }
}
