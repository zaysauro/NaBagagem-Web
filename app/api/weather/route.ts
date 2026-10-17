import { NextResponse } from "next/server";
import { dailyWeatherSeries, fetchWeatherForecast, parseCoordinates } from "@/lib/weather";

export async function GET(request: Request) {
  const coordinates = parseCoordinates(new URL(request.url).searchParams);
  if (!coordinates) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const data = await fetchWeatherForecast(coordinates, { signal: request.signal });
    return NextResponse.json({
      ...coordinates,
      timezone: data.timezone,
      daily: dailyWeatherSeries(data.days),
    });
  } catch {
    return NextResponse.json({ error: "Serviço de clima indisponível." }, { status: 502 });
  }
}
