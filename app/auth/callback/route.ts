import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/login?error=link-invalido", requestUrl.origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=link-expirado", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
