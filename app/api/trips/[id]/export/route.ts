import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" }[c] || c));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase() || "gpx";
  if (!["gpx", "kml"].includes(format)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: trip, error } = await supabase.from("trips").select("id,title,description").eq("id", id).eq("user_id", user.id).single();
  if (error || !trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

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
