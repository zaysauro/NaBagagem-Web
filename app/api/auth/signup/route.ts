import { NextResponse } from "next/server";
import { auth } from "@/lib/neon/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    const { data, error } = await auth.signUp.email({
      email,
      password,
      name,
    });

    if (error) return NextResponse.json({ error: "Não foi possível criar a conta. Confira os dados." }, { status: 400 });

    return NextResponse.json({
      authenticated: Boolean(data?.token),
      message: data?.token
        ? "Conta criada."
        : "Conta criada. Confira seu e-mail para confirmar a conta.",
    });
  } catch (error) {
    console.error("signup_failed");
    return NextResponse.json(
      { error: "Não foi possível criar a conta agora." },
      { status: 500 }
    );
  }
}
