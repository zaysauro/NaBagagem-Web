import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c] || c));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase() || "gpx";
  if (!["gpx", "kml", "json", "ics"].includes(format)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: trip, error } = await supabase.from("trips").select("id,title,description").eq("id", id).eq("user_id", user.id).single();
  if (error || !trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  if (format === "ics") {
    const { data: events } = await supabase.from("trip_events").select("id,title,description,event_date,start_time,end_time,location_id").eq("trip_id", id).order("event_date").order("start_time");
    const locationIds = (events || []).map((e: any) => e.location_id).filter(Boolean);
    const { data: locations } = locationIds.length ? await supabase.from("trip_locations").select("id,name,city,country").in("id", locationIds) : { data: [] as any[] };
    const locationMap = new Map((locations || []).map((l: any) => [l.id, l]));
    const escIcs = (value: any) => String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\\\n");
    const dt = (date: any, time: any) => { if (!date) return null; const raw = String(time || "00:00").slice(0,5).replace(":", ""); return String(date).replace(/-/g, "") + "T" + raw + "00"; };
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//NaBagagem//Trip Calendar//PT-BR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
    for (const event of events || []) {
      const start = dt(event.event_date, event.start_time); if (!start) continue;
      const end = dt(event.event_date, event.end_time);
      const loc = locationMap.get(event.location_id);
      lines.push("BEGIN:VEVENT","UID:"+event.id+"@nabagagem","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\\.\\d{3}/,""),"DTSTART:"+start);
      if (end) lines.push("DTEND:"+end);
      lines.push("SUMMARY:"+escIcs(event.title));
      if (event.description) lines.push("DESCRIPTION:"+escIcs(event.description));
      if (loc) lines.push("LOCATION:"+escIcs([loc.name,loc.city,loc.country].filter(Boolean).join(", ")));
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const filename = trip.title.replace(/[^a-z0-9_-]+/gi,"_") || "viagem";
    return new NextResponse(lines.join("\r\n")+"\r\n",{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"attachment; filename=\""+filename+".ics\""}});
  }
  if (format === "json") {
    const [{ data: locations }, { data: events }, { data: expenses }, { data: checklist }] = await Promise.all([
      supabase.from("trip_locations").select("*").eq("trip_id", id).order("order_index").order("created_at"),
      supabase.from("trip_events").select("*").eq("trip_id", id).order("day_index").order("event_date").order("start_time"),
      supabase.from("trip_expenses").select("*").eq("trip_id", id).order("expense_date").order("created_at"),
      supabase.from("trip_checklist_items").select("*").eq("trip_id", id).order("created_at")
    ]);
    const backup = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), trip, locations: locations || [], events: events || [], expenses: expenses || [], checklist: checklist || [] }, null, 2);
    const filename = trip.title.replace(/[^a-z0-9_-]+/gi, "_") || "viagem";
    return new NextResponse(backup, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`
      }
    });
  }

  const { data: locations } = await supabase.from("trip_locations")
    .select("name,city,country,latitude,longitude,notes,order_index").eq("trip_id", id).order("order_index").order("created_at");
  const points = (locations || []).filter((p: any) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  if (format === "kml") {
    const placemarks = points.map((p: any) => `<Placemark><name>${esc(p.name)}</name><description>${esc([p.city,p.country,p.notes].filter(Boolean).join(" — "))}</description><Point><coordinates>${p.longitude},${p.latitude},0</coordinates></Point></Placemark>`).join("");
    const coordinates = points.map((p: any) => `${p.longitude},${p.latitude},0`).join(" ");
    const route = points.length > 1 ? `<Placemark><name>Rota</name><LineString><tessellate>1</tessellate><coordinates>${coordinates}</coordinates></LineString></Placemark>` : "";
    const xml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(trip.title)}</name>${placemarks}${route}</Document></kml>`;
    return new NextResponse(xml, { headers: { "Content-Type": "application/vnd.google-earth.kml+xml", "Content-Disposition": `attachment; filename="${trip.title.replace(/[^a-z0-9_-]+/gi,"_")}.kml"` } });
  }

  const waypoints = points.map((p: any) => `<wpt lat="${p.latitude}" lon="${p.longitude}"><name>${esc(p.name)}</name><desc>${esc([p.city,p.country,p.notes].filter(Boolean).join(" — "))}</desc></wpt>`).join("");
  const trk = points.length > 1 ? `<trk><name>${esc(trip.title)}</name><trkseg>${points.map((p: any) => `<trkpt lat="${p.latitude}" lon="${p.longitude}"></trkpt>`).join("")}</trkseg></trk>` : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="NaBagagem" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${esc(trip.title)}</name><desc>${esc(trip.description)}</desc></metadata>${waypoints}${trk}</gpx>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/gpx+xml", "Content-Disposition": `attachment; filename="${trip.title.replace(/[^a-z0-9_-]+/gi,"_")}.gpx"` } });
}
