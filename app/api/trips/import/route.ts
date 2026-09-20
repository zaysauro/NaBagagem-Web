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
  if (!name.endsWith(".gpx") && !name.endsWith(".kml")) return NextResponse.json({ error: "Formato aceito: GPX ou KML." }, { status: 400 });
  const xml = await file.text();
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
