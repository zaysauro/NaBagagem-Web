import { NextResponse } from "next/server";
import { auth } from "@/lib/neon/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }

    const { error } = await auth.signIn.email({ email, password });

    if (error) return NextResponse.json({ error: "Não foi possível entrar. Confira seus dados." }, { status: 401 });

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("login_failed");
    return NextResponse.json(
      { error: "Não foi possível entrar agora." },
      { status: 500 }
    );
  }
}
