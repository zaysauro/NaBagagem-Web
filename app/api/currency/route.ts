import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = (params.get("from") || "BRL").toUpperCase();
  const to = (params.get("to") || "USD").toUpperCase();
  const amount = Number(params.get("amount") || "1");

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Moeda ou valor inválido." }, { status: 400 });
  }
  if (from === to) return NextResponse.json({ from, to, amount, rate: 1, converted: amount });

  try {
    const url = new URL("https://api.frankfurter.app/latest");
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    const response = await fetch(url, { next: { revalidate: 900 } });
    const data = await response.json();
    if (!response.ok || typeof data.rates?.[to] !== "number") {
      return NextResponse.json({ error: "Não foi possível obter a cotação." }, { status: 502 });
    }
    const converted = data.rates[to];
    return NextResponse.json({ from, to, amount, rate: converted / amount, converted, date: data.date });
  } catch {
    return NextResponse.json({ error: "Serviço de câmbio indisponível." }, { status: 502 });
  }
}
