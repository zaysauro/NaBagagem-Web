import { NextResponse } from "next/server";
import { auth } from "@/lib/neon/auth";
export async function POST(request: Request) {
 await auth.signOut();
 const response = NextResponse.redirect(new URL("/login", request.url), 303);
 response.headers.set("Clear-Site-Data", '"cache", "storage"');
 return response;
}
