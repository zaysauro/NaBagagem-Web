import { NextRequest, NextResponse } from "next/server";
// Managed Auth validates its own trusted origins. Protect all other mutations here.
export function proxy(request: NextRequest) {
 if (!["GET","HEAD","OPTIONS"].includes(request.method) && !request.nextUrl.pathname.startsWith("/api/auth/")) {
  const origin=request.headers.get("origin");
  if (request.headers.get("sec-fetch-site")==="cross-site" || (origin && origin!==request.nextUrl.origin)) return NextResponse.json({error:"Origem da solicitação inválida."},{status:403});
 }
 const response=NextResponse.next();
 response.headers.set("Cache-Control","private, no-store");
 response.headers.set("X-Content-Type-Options","nosniff");
 response.headers.set("Referrer-Policy","no-referrer");
 return response;
}
export const config={matcher:["/api/:path*","/dashboard/:path*","/convite"]};
