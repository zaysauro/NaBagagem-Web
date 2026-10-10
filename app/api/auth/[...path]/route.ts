import { auth } from "@/lib/neon/auth";
import { signupValidation } from "@/lib/auth-feedback";
import { NextRequest, NextResponse } from "next/server";

const handlers = auth.handler();
export const { GET, PUT, DELETE, PATCH } = handlers;
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
 const { path } = await context.params;
 if (path.join("/") === "sign-up/email") {
  try {
   const body = await request.clone().json();
   const invalid = signupValidation(typeof body.name === "string" ? body.name : "", typeof body.email === "string" ? body.email : "", typeof body.password === "string" ? body.password : "");
   if (invalid) return NextResponse.json({code:"VALIDATION_ERROR",message:invalid},{status:400});
  } catch { return NextResponse.json({code:"VALIDATION_ERROR",message:"Confira os dados do cadastro."},{status:400}); }
 }
 const response = await handlers.POST(request, context);
 if (!response.ok) {
  const result = await response.clone().json().catch(()=>null);
  const code = typeof result?.code === "string" && /^[A-Z_]{1,64}$/.test(result.code) ? result.code : "AUTH_REQUEST_FAILED";
  // Record only a fixed operation, status and provider code. Never credentials or response bodies.
  const operation = path.join("/") === "sign-up/email" ? "signup" : path.join("/") === "sign-in/email" ? "login" : "other";
  console.warn("auth_request_failed", { operation, status: response.status, code });
 }
 return response;
}
