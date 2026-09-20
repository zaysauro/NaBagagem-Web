import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function context(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, trip: null };
  const { data: trip } = await supabase.from("trips").select("id,user_id,title").eq("id", id).maybeSingle();
  return { supabase, user, trip };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, trip } = await context((await params).id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const { data: members, error } = await supabase
    .from("trip_members")
    .select("id,user_id,role,created_at,profiles:user_id(id,display_name,username,avatar_url)")
    .eq("trip_id", trip.id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    owner: { id: trip.user_id },
    members: members ?? [],
    currentUserId: user.id,
    canManage: trip.user_id === user.id,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, trip } = await context((await params).id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: "Somente o proprietário pode gerenciar colaboradores." }, { status: 403 });

  const body = await request.json();
  const username = String(body.username || "").trim().toLowerCase();
  const role = body.role === "editor" ? "editor" : "viewer";
  if (!username) return NextResponse.json({ error: "Informe o username do viajante." }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("id,display_name,username,avatar_url").eq("username", username).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Usuário não encontrado. Peça para ele criar um username no perfil." }, { status: 404 });
  if (profile.id === user.id) return NextResponse.json({ error: "Você já é o proprietário desta viagem." }, { status: 400 });

  const { data: member, error } = await supabase.from("trip_members")
    .upsert({ trip_id: trip.id, user_id: profile.id, role }, { onConflict: "trip_id,user_id" })
    .select("id,user_id,role,created_at,profiles:user_id(id,display_name,username,avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, trip } = await context((await params).id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip || trip.user_id !== user.id) return NextResponse.json({ error: "Somente o proprietário pode alterar colaboradores." }, { status: 403 });

  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "Colaborador inválido." }, { status: 400 });
  const body = await request.json();
  const role = body.role === "editor" ? "editor" : body.role === "viewer" ? "viewer" : null;
  if (!role) return NextResponse.json({ error: "Permissão inválida." }, { status: 400 });

  const { data, error } = await supabase.from("trip_members").update({ role }).eq("id", memberId).eq("trip_id", trip.id)
    .select("id,user_id,role,created_at,profiles:user_id(id,display_name,username,avatar_url)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, trip } = await context((await params).id);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!trip) return NextResponse.json({ error: "Viagem não encontrada." }, { status: 404 });

  const memberId = new URL(request.url).searchParams.get("memberId");
  const memberUserId = new URL(request.url).searchParams.get("userId");
  if (!memberId && !memberUserId) return NextResponse.json({ error: "Colaborador inválido." }, { status: 400 });

  let query = supabase.from("trip_members").delete().eq("trip_id", trip.id);
  if (trip.user_id === user.id) {
    if (memberId) query = query.eq("id", memberId);
    else query = query.eq("user_id", memberUserId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
