import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "Informe um local." }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": "NaBagagem-Web/1.0 contact:nabagagemweb.vercel.app" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return NextResponse.json({ error: "Serviço de mapas indisponível." }, { status: 502 });

  const results = await response.json();
  if (!results.length) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });

  const item = results[0];
  return NextResponse.json({ latitude: Number(item.lat), longitude: Number(item.lon), display_name: item.display_name });
}
