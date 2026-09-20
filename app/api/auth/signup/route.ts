import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      authenticated: Boolean(data.session),
      message: data.session
        ? "Conta criada."
        : "Conta criada. Confira seu e-mail para confirmar a conta.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar conta." },
      { status: 500 }
    );
  }
}
