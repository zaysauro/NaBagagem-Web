import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trips: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim() || null;
  const start_date = body.start_date || null;
  const end_date = body.end_date || null;

  if (!title) {
    return NextResponse.json({ error: "Informe o nome da viagem." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({ user_id: user.id, title, description, start_date, end_date })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ trip: data }, { status: 201 });
}
