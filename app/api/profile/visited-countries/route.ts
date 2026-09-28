import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabase
    .from("profile_visited_countries")
    .select("id,country,created_at")
    .eq("user_id", user.id)
    .order("country", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ countries: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const country = typeof body.country === "string" ? body.country.trim() : "";
  if (!country) return NextResponse.json({ error: "Informe um país." }, { status: 400 });
  if (country.length > 100) return NextResponse.json({ error: "Nome de país inválido." }, { status: 400 });

  // Fazemos INSERT direto em vez de upsert para que o cadastro dependa
  // somente da policy INSERT (WITH CHECK), sem exigir uma leitura implícita
  // durante o upsert.
  const { data, error } = await supabase
    .from("profile_visited_countries")
    .insert({ user_id: user.id, country })
    .select("id,country,created_at")
    .single();

  if (!error) return NextResponse.json({ country: data });

  // País já cadastrado: retorna o registro existente.
  if (error.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("profile_visited_countries")
      .select("id,country,created_at")
      .eq("user_id", user.id)
      .eq("country", country)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    return NextResponse.json({ country: existing }, { status: 200 });
  }

  return NextResponse.json({ error: error.message }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

  const { error } = await supabase
    .from("profile_visited_countries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
