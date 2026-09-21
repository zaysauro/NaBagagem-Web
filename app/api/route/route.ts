import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const raw = new URL(request.url).searchParams.get("points");
  if (!raw) return NextResponse.json({ error: "Pontos não informados." }, { status: 400 });

  let points: Array<{ latitude: number; longitude: number }>;
  try {
    points = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Pontos inválidos." }, { status: 400 });
  }

  if (!Array.isArray(points) || points.length < 2 || points.length > 50) {
    return NextResponse.json({ error: "A rota precisa ter entre 2 e 50 pontos." }, { status: 400 });
  }

  if (!points.every((p) =>
    Number.isFinite(p?.latitude) &&
    Number.isFinite(p?.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  )) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  const coordinates = points.map((p) => p.longitude + "," + p.latitude).join(";");
  const url = "https://router.project-osrm.org/route/v1/driving/" + coordinates +
    "?overview=full&geometries=geojson&steps=false";

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) return NextResponse.json({ error: "Serviço de rotas indisponível." }, { status: 502 });

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates) {
    return NextResponse.json({ error: "Não foi possível calcular a rota." }, { status: 502 });
  }

  return NextResponse.json({
    distanceKm: Number(route.distance || 0) / 1000,
    durationMinutes: Number(route.duration || 0) / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
  });
}
