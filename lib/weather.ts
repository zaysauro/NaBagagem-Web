export type Coordinates = { latitude: number; longitude: number };
export type WeatherDay = {
  date: string;
  min: number;
  max: number;
  code: number | null;
  rain: number | null;
  precipitation: number | null;
  wind: number | null;
};

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function parseCoordinates(params: URLSearchParams): Coordinates | null {
  const lat = params.get("latitude"), lon = params.get("longitude");
  if (!lat?.trim() || !lon?.trim()) return null;
  const latitude = Number(lat), longitude = Number(lon);
  return validCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid weather response");
  return value as Record<string, unknown>;
}

function optionalNumbers(value: unknown, length: number, min: number, max: number): (number | null)[] {
  if (value == null) return Array<number | null>(length).fill(null);
  if (!Array.isArray(value) || value.length !== length) throw new Error("Invalid weather series");
  return value.map(item => {
    if (item === null) return null;
    if (typeof item !== "number" || !Number.isFinite(item) || item < min || item > max) throw new Error("Invalid weather value");
    return item;
  });
}

// Missing measurements remain unknown; they must never appear as 0 °C or 0% rain.
export function parseWeatherDays(value: unknown): WeatherDay[] {
  const daily = record(record(value).daily);
  const dates = daily.time;
  if (!Array.isArray(dates) || dates.length < 1 || dates.length > 7
    || dates.some((date, index) => !isCalendarDate(date) || (index > 0 && date <= dates[index - 1]))) {
    throw new Error("Invalid forecast dates");
  }
  if (!Array.isArray(daily.temperature_2m_min) || !Array.isArray(daily.temperature_2m_max)) throw new Error("Missing temperatures");
  const min = optionalNumbers(daily.temperature_2m_min, dates.length, -150, 100);
  const max = optionalNumbers(daily.temperature_2m_max, dates.length, -150, 100);
  const code = optionalNumbers(daily.weather_code ?? daily.weathercode, dates.length, 0, 99);
  const rain = optionalNumbers(daily.precipitation_probability_max, dates.length, 0, 100);
  const precipitation = optionalNumbers(daily.precipitation_sum, dates.length, 0, 10000);
  const wind = optionalNumbers(daily.wind_speed_10m_max, dates.length, 0, 1000);
  const days: WeatherDay[] = [];
  for (let i = 0; i < dates.length; i++) {
    const low = min[i], high = max[i];
    if (low === null || high === null) continue;
    if (low > high || (code[i] !== null && !Number.isInteger(code[i]))) throw new Error("Invalid forecast range");
    days.push({ date: dates[i], min: low, max: high, code: code[i], rain: rain[i], precipitation: precipitation[i], wind: wind[i] });
  }
  if (!days.length) throw new Error("No forecast measurements");
  return days;
}

export function dailyWeatherSeries(days: WeatherDay[]) {
  return {
    time: days.map(day => day.date),
    temperature_2m_min: days.map(day => day.min),
    temperature_2m_max: days.map(day => day.max),
    weathercode: days.map(day => day.code),
    precipitation_probability_max: days.map(day => day.rain),
  };
}

export async function fetchWeatherForecast(
  coordinates: Coordinates,
  options: { alerts?: boolean; signal?: AbortSignal; timeoutMs?: number; fetcher?: typeof fetch } = {},
) {
  if (!validCoordinates(coordinates.latitude, coordinates.longitude)) throw new Error("Invalid coordinates");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(coordinates.latitude));
  url.searchParams.set("longitude", String(coordinates.longitude));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    + (options.alerts ? ",precipitation_sum,wind_speed_10m_max" : ""));
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 8000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await (options.fetcher ?? fetch)(url, { next: { revalidate: 900 }, signal });
  if (!response.ok) throw new Error("Weather service unavailable");
  const data = record(await response.json());
  signal.throwIfAborted();
  return { days: parseWeatherDays(data), timezone: typeof data.timezone === "string" ? data.timezone : null };
}
