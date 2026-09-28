import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Informe seu e-mail." }, { status: 400 });

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectTo = new URL("/auth/callback?next=/redefinir-senha", siteUrl).toString();

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("Password recovery error:", error);
      return NextResponse.json({ error: "Não foi possível enviar o e-mail de recuperação. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ sent: true, message: "Se existe uma conta com esse e-mail, enviamos as instruções para redefinir a senha." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Não foi possível processar a solicitação." }, { status: 500 });
  }
}
