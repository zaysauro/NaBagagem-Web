import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const profiles = {
  driving: { host: "https://router.project-osrm.org", profile: "driving" },
  walking: { host: "https://routing.openstreetmap.de/routed-foot", profile: "driving" },
  cycling: { host: "https://routing.openstreetmap.de/routed-bike", profile: "driving" },
} as const;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const raw = params.get("points");
  const mode = (params.get("mode") || "driving") as keyof typeof profiles;
  if (!raw) return NextResponse.json({ error: "Pontos não informados." }, { status: 400 });
  if (!profiles[mode]) return NextResponse.json({ error: "Modo de transporte inválido." }, { status: 400 });

  let points: Array<{ latitude: number; longitude: number }>;
  try { points = JSON.parse(raw); } catch { return NextResponse.json({ error: "Pontos inválidos." }, { status: 400 }); }
  if (!Array.isArray(points) || points.length < 2 || points.length > 50) {
    return NextResponse.json({ error: "A rota precisa ter entre 2 e 50 pontos." }, { status: 400 });
  }
  if (!points.every((p) => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180)) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  const coordinates = points.map((p) => p.longitude + "," + p.latitude).join(";");
  const provider = profiles[mode];
  const url = provider.host + "/route/v1/" + provider.profile + "/" + coordinates + "?overview=full&geometries=geojson&steps=false";
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) return NextResponse.json({ error: "Serviço de rotas indisponível." }, { status: 502 });
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates) return NextResponse.json({ error: "Não foi possível calcular a rota." }, { status: 502 });

  return NextResponse.json({
    mode,
    distanceKm: Number(route.distance || 0) / 1000,
    durationMinutes: Number(route.duration || 0) / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
  });
}
