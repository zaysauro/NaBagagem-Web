import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para copiar a viagem." }, { status: 401 });
  const body = await request.json();
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "Link de compartilhamento inválido." }, { status: 400 });

  const { data: source } = await supabase.from("trips")
    .select("id,title,description,start_date,end_date").eq("share_token", token).maybeSingle();
  if (!source) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const { data: copy, error: tripError } = await supabase.from("trips").insert({
    user_id: user.id,
    title: source.title + " (cópia)",
    description: source.description,
    start_date: source.start_date,
    end_date: source.end_date
  }).select("id").single();
  if (tripError || !copy) return NextResponse.json({ error: tripError?.message || "Não foi possível copiar a viagem." }, { status: 400 });

  const { data: locations } = await supabase.from("trip_locations")
    .select("id,name,city,country,latitude,longitude,visited_at,notes,order_index")
    .eq("trip_id", source.id).order("order_index").order("created_at");

  const locationMap = new Map<string,string>();
  if (locations?.length) {
    const rows = locations.map((l:any)=>({trip_id:copy.id,name:l.name,city:l.city,country:l.country,latitude:l.latitude,longitude:l.longitude,visited_at:l.visited_at,notes:l.notes,order_index:l.order_index}));
    const { data: insertedLocations, error } = await supabase.from("trip_locations").insert(rows).select("id,order_index");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    (insertedLocations || []).forEach((l:any,i:number)=>locationMap.set(String(locations[i].id),String(l.id)));
  }

  const { data: events } = await supabase.from("trip_events")
    .select("title,description,event_date,start_time,end_time,location_id,day_index,status,color")
    .eq("trip_id", source.id).order("day_index").order("event_date").order("start_time");
  if (events?.length) {
    const rows = events.map((e:any)=>({trip_id:copy.id,title:e.title,description:e.description,event_date:e.event_date,start_time:e.start_time,end_time:e.end_time,location_id:e.location_id?locationMap.get(String(e.location_id))||null:null,day_index:e.day_index,status:e.status,color:e.color}));
    const { error } = await supabase.from("trip_events").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ trip_id: copy.id }, { status: 201 });
}