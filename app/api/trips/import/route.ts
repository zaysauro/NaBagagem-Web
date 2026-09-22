import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function tag(text: string, name: string) {
  const m = text.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}
function attr(text: string, name: string) {
  const m = text.match(new RegExp(name + '="([^"]+)"', "i"));
  return m ? m[1] : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo GPX ou KML." }, { status: 400 });
  const name = file.name.toLowerCase();
  if (!name.endsWith(".gpx") && !name.endsWith(".kml") && !name.endsWith(".json")) return NextResponse.json({ error: "Formato aceito: GPX, KML ou Backup JSON." }, { status: 400 });
  const raw = await file.text();
  if (name.endsWith(".json")) {
    if (raw.length > 5_000_000) return NextResponse.json({ error: "Arquivo muito grande." }, { status: 400 });
    let backup: any;
    try { backup = JSON.parse(raw); } catch { return NextResponse.json({ error: "Backup JSON inválido." }, { status: 400 }); }
    if (!backup || backup.version !== 1 || !backup.trip) return NextResponse.json({ error: "Backup NaBagagem inválido ou incompatível." }, { status: 400 });
    const tripInput = backup.trip;
    const title = String(tripInput.title || "Viagem restaurada").trim() || "Viagem restaurada";
    const { data: trip, error: tripError } = await supabase.from("trips").insert({
      user_id:user.id,title,description:tripInput.description||null,start_date:tripInput.start_date||null,end_date:tripInput.end_date||null,budget_amount:tripInput.budget_amount??null,budget_currency:tripInput.budget_currency||"BRL"
    }).select().single();
    if (tripError) return NextResponse.json({ error: tripError.message }, { status: 400 });
    const sourceLocations = Array.isArray(backup.locations) ? backup.locations.slice(0,500) : [];
    const locationRows = sourceLocations.map((p:any,index:number)=>({trip_id:trip.id,name:String(p.name||"Destino"),city:p.city||null,country:p.country||null,latitude:Number.isFinite(Number(p.latitude))?Number(p.latitude):null,longitude:Number.isFinite(Number(p.longitude))?Number(p.longitude):null,visited_at:p.visited_at||null,notes:p.notes||null,order_index:index}));
    const locationMap = new Map<string,string>();
    let locations:any[] = [];
    if(locationRows.length){const {data,error}=await supabase.from("trip_locations").insert(locationRows).select("id");if(error)return NextResponse.json({error:error.message},{status:400});locations=data||[];locationRows.forEach((row:any,index:number)=>{const source=sourceLocations[index];if(source?.id&&locations[index]?.id)locationMap.set(String(source.id),locations[index].id);});}
    const events = Array.isArray(backup.events) ? backup.events.slice(0,1000).map((e:any)=>({trip_id:trip.id,title:String(e.title||"Atividade"),description:e.description||null,event_date:e.event_date||null,start_time:e.start_time||null,end_time:e.end_time||null,location_id:e.location_id&&locationMap.has(String(e.location_id))?locationMap.get(String(e.location_id)):null,day_index:Number.isInteger(Number(e.day_index))?Number(e.day_index):1,status:["completed","in_progress","future"].includes(e.status)?e.status:"future",color:/^#[0-9a-f]{6}$/i.test(String(e.color||""))?e.color:"#111827",reservation_name:e.reservation_name||null,confirmation_code:e.confirmation_code||null,reservation_url:e.reservation_url||null,reminder_minutes:Number.isInteger(Number(e.reminder_minutes))?Number(e.reminder_minutes):null})) : [];
    const expenses = Array.isArray(backup.expenses) ? backup.expenses.slice(0,2000).map((e:any)=>({trip_id:trip.id,title:String(e.title||"Gasto"),amount:Number(e.amount)||0,currency:String(e.currency||"BRL").toUpperCase(),category:e.category||"other",expense_date:e.expense_date||null,notes:e.notes||null})) : [];
    const checklist = Array.isArray(backup.checklist) ? backup.checklist.slice(0,1000).map((e:any,index:number)=>({trip_id:trip.id,title:String(e.title||"Item"),completed:!!e.completed,order_index:index})) : [];
    if(expenses.length){const {error}=await supabase.from("trip_expenses").insert(expenses);if(error)return NextResponse.json({error:error.message},{status:400});}
    if(checklist.length){const {error}=await supabase.from("trip_checklist_items").insert(checklist);if(error)return NextResponse.json({error:error.message},{status:400});}
    if(events.length){const {error}=await supabase.from("trip_events").insert(events);if(error)return NextResponse.json({error:error.message},{status:400});}
    return NextResponse.json({trip,imported:{locations:locations.length,events:events.length,expenses:expenses.length,checklist:checklist.length}},{status:201});
  }

  const xml = raw;
  if (xml.length > 5_000_000) return NextResponse.json({ error: "Arquivo muito grande." }, { status: 400 });

  const title = String(form.get("title") || file.name.replace(/\.(gpx|kml)$/i, "")).trim() || "Viagem importada";
  const { data: trip, error: tripError } = await supabase.from("trips").insert({ user_id: user.id, title }).select().single();
  if (tripError) return NextResponse.json({ error: tripError.message }, { status: 400 });

  const points: { name: string; latitude: number; longitude: number }[] = [];
  if (name.endsWith(".gpx")) {
    for (const match of xml.matchAll(/<wpt\b([^>]*)>([\s\S]*?)<\/wpt>/gi)) {
      const latitude = Number(attr(match[1], "lat")); const longitude = Number(attr(match[1], "lon"));
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) points.push({ name: tag(match[2], "name") || "Ponto GPX", latitude, longitude });
    }
    for (const match of xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi)) {
      const latitude = Number(attr(match[1], "lat")); const longitude = Number(attr(match[1], "lon"));
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) points.push({ name: tag(match[2], "name") || "Ponto da rota", latitude, longitude });
    }
  } else {
    for (const match of xml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi)) {
      const nameText = tag(match[1], "name") || "Ponto KML";
      const coordinates = tag(match[1], "coordinates").split(/\s+/)[0].split(",");
      const longitude = Number(coordinates[0]); const latitude = Number(coordinates[1]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) points.push({ name: nameText, latitude, longitude });
    }
  }

  const rows = points.slice(0, 500).map((p, index) => ({ trip_id: trip.id, name: p.name, latitude: p.latitude, longitude: p.longitude, order_index: index }));
  if (rows.length) {
    const { error } = await supabase.from("trip_locations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ trip, imported: rows.length }, { status: 201 });
}
