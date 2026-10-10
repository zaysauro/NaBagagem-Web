import { NextResponse } from "next/server";
// Supabase PKCE codes are not Neon Auth sessions. Neon owns /api/auth/[...path].
export async function GET(request: Request) {
 return NextResponse.redirect(new URL("/login?error=link-invalido",request.url));
}
