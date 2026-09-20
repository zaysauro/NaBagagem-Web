import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Trip = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
};

type Location = {
  id: string;
  trip_id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type WeatherDay = {
  date: string;
  precipitation_probability_max?: number;
  precipitation_sum?: number;
  wind_speed_10m_max?: number;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
  weathercode?: number;
};

function weatherLabel(code: number | undefined) {
  if (code === 0) return "céu limpo";
  if (code != null && code <= 3) return "céu parcialmente nublado";
  if (code != null && code <= 48) return "neblina";
  if (code != null && code <= 57) return "garoa";
  if (code != null && code <= 67) return "chuva";
  if (code != null && code <= 77) return "neve";
  if (code != null && code <= 82) return "pancadas";
  if (code != null && code <= 86) return "neve forte";
  if (code != null && code <= 99) return "trovoada";
  return "condições instáveis";
}

function isAlert(day: WeatherDay) {
  const rainProbability = day.precipitation_probability_max ?? 0;
  const precipitation = day.precipitation_sum ?? 0;
  const wind = day.wind_speed_10m_max ?? 0;
  const code = day.weathercode ?? -1;

  if (code >= 95) return { type: "storm", reason: "há previsão de trovoada" };
  if (rainProbability >= 70 && precipitation >= 8) {
    return { type: "rain", reason: "há alta chance de chuva" };
  }
  if (wind >= 60) return { type: "wind", reason: "há previsão de ventos fortes" };
  if (rainProbability >= 85) {
    return { type: "rain", reason: "há alta probabilidade de chuva" };
  }
  return null;
}

async function fetchForecast(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max"
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    next: { revalidate: 900 },
  });

  if (!response.ok) throw new Error("Open-Meteo indisponível.");

  const data = await response.json();
  const daily = data.daily;

  return (daily?.time || []).map((date: string, index: number) => ({
    date,
    precipitation_probability_max: daily.precipitation_probability_max?.[index] ?? 0,
    precipitation_sum: daily.precipitation_sum?.[index] ?? 0,
    wind_speed_10m_max: daily.wind_speed_10m_max?.[index] ?? 0,
    temperature_2m_max: daily.temperature_2m_max?.[index],
    temperature_2m_min: daily.temperature_2m_min?.[index],
    weathercode: daily.weathercode?.[index],
  })) as WeatherDay[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: preferences, error: preferencesError } = await supabase
    .from("notification_preferences")
    .select("weather_alerts")
    .eq("user_id", user.id)
    .maybeSingle();

  if (preferencesError) {
    return NextResponse.json({ error: preferencesError.message }, { status: 400 });
  }

  if (preferences?.weather_alerts === false) {
    return NextResponse.json({ ok: true, skipped: "weather_alerts_disabled", created: 0 });
  }

  let body: { localDate?: string } = {};
  try {
    body = await request.json();
  } catch {
    // The endpoint also works without a request body.
  }

  const fallbackToday = new Date().toISOString().slice(0, 10);
  const today = body.localDate?.match(/^\\d{4}-\\d{2}-\\d{2}$/)?.[0] || fallbackToday;
  const inSevenDays = new Date(today + "T12:00:00Z");
  inSevenDays.setUTCDate(inSevenDays.getUTCDate() + 7);
  const until = inSevenDays.toISOString().slice(0, 10);

  const { data: allTrips, error: tripsError } = await supabase
    .from("trips")
    .select("id,title,start_date,end_date")
    .eq("user_id", user.id)
    .order("start_date");

  if (tripsError) {
    return NextResponse.json({ error: tripsError.message }, { status: 400 });
  }

  const trips = ((allTrips || []) as Trip[]).filter((trip) => {
    if (trip.end_date && trip.end_date < today) return false;
    if (trip.start_date && trip.start_date > until) return false;
    return true;
  });

  if (!trips.length) {
    return NextResponse.json({ ok: true, created: 0 });
  }

  const tripIds = trips.map((trip: Trip) => trip.id);
  const { data: locations, error: locationsError } = await supabase
    .from("trip_locations")
    .select("id,trip_id,name,city,country,latitude,longitude")
    .in("trip_id", tripIds)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (locationsError) {
    return NextResponse.json({ error: locationsError.message }, { status: 400 });
  }

  const usableLocations = (locations || []) as Location[];
  const tripMap = new Map((trips as Trip[]).map((trip) => [trip.id, trip]));

  // Dedupe identical coordinates so a trip with several labels for the same
  // destination does not hammer Open-Meteo with repeated requests.
  const groups = new Map<string, Location[]>();
  for (const location of usableLocations) {
    const key = Number(location.latitude).toFixed(4) + ":" + Number(location.longitude).toFixed(4);
    const current = groups.get(key) || [];
    current.push(location);
    groups.set(key, current);
  }

  const rows: Array<Record<string, string | null>> = [];

  for (const [coordinateKey, groupedLocations] of groups) {
    const [latitude, longitude] = coordinateKey.split(":").map(Number);

    let forecast: WeatherDay[];
    try {
      forecast = await fetchForecast(latitude, longitude);
    } catch {
      continue;
    }

    for (const location of groupedLocations) {
      const trip = tripMap.get(location.trip_id);
      if (!trip) continue;

      for (const day of forecast) {
        if (day.date < today) continue;
        if (trip.start_date && day.date < trip.start_date) continue;
        if (trip.end_date && day.date > trip.end_date) continue;

        const alert = isAlert(day);
        if (!alert) continue;

        const label = weatherLabel(day.weathercode);
        const place = location.city || location.name;
        const probability = day.precipitation_probability_max ?? 0;
        const precipitation = day.precipitation_sum ?? 0;
        const wind = day.wind_speed_10m_max ?? 0;

        const details =
          alert.type === "rain"
            ? "Chance de chuva: " + Math.round(probability) + "% (" + precipitation.toFixed(1) + " mm)."
            : alert.type === "wind"
              ? "Vento máximo previsto: " + Math.round(wind) + " km/h."
              : "Condição prevista: " + label + ".";

        rows.push({
          user_id: user.id,
          type: "weather_alert",
          title: "Alerta de clima em " + place,
          body: trip.title + " em " + day.date + ": " + alert.reason + ". " + details,
          href: "/dashboard/trips/" + trip.id,
          dedupe_key:
            "weather:" +
            trip.id +
            ":" +
            location.id +
            ":" +
            day.date +
            ":" +
            alert.type,
          actor_id: null,
        });
      }
    }
  }

  if (rows.length) {
    const { error } = await supabase
      .from("notifications")
      .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, created: rows.length });
}
