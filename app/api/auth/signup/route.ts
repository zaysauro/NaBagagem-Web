import { NextResponse } from "next/server";
import { authFeedback, signupValidation } from "@/lib/auth-feedback";
import { auth } from "@/lib/neon/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    const invalid = signupValidation(name,email,password);
    if (invalid) return NextResponse.json({error:invalid},{status:400});

    const { data, error } = await auth.signUp.email({
      email,
      password,
      name,
    });

    if (error) return NextResponse.json({ error: authFeedback(error,"signup") }, { status: 400 });

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
