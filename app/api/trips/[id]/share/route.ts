import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const token = crypto.randomUUID().replaceAll("-", "");
  const { data, error } = await supabase.from("trips").update({ share_token: token }).eq("id", id).eq("user_id", user.id).select("id,share_token").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ token: data.share_token, url: `/viagem/${data.share_token}` });
}
