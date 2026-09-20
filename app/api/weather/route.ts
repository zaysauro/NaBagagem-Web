import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("latitude"));
  const longitude = Number(params.get("longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");
    const response = await fetch(url, { next: { revalidate: 900 } });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Não foi possível obter a previsão." }, { status: 502 });

    return NextResponse.json({
      latitude, longitude,
      timezone: data.timezone,
      daily: data.daily ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Serviço de clima indisponível." }, { status: 502 });
  }
}
