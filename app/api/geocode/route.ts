import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  const reverse = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!reverse && !query) return NextResponse.json({ error: "Informe um local." }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/" + (reverse ? "reverse" : "search"));
  if (reverse) {
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
  } else {
    url.searchParams.set("q", query!);
    url.searchParams.set("limit", "6");
  }
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");

  const response = await fetch(url, {
    headers: { "User-Agent": "NaBagagem-Web/1.0 contact:nabagagemweb.vercel.app" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return NextResponse.json({ error: "Serviço de mapas indisponível." }, { status: 502 });

  const payload = await response.json();
  const results = reverse ? [payload] : payload;
  const places = (results || [])
    .map((item: any) => ({
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      display_name: String(item.display_name || ""),
      name: String(item.name || item.display_name?.split(",")[0] || "Local"),
      city: String(item.address?.city || item.address?.town || item.address?.municipality || item.address?.village || ""),
      country: String(item.address?.country || ""),
      type: String(item.type || ""),
    }))
    .filter((item: any) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

  if (!places.length) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });
  return NextResponse.json({ places });
}
