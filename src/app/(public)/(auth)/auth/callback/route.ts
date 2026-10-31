import { NextResponse, type NextRequest } from "next/server";
import { completeAuthLink, safeNext } from "@/services/auth";

// Where confirmation and reset emails land. A confirmed sign-up goes to the
// portal; the portal layout sends anyone who isn't a customer to their own home.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const ok = await completeAuthLink(url.searchParams);
  const dest = ok ? (safeNext(url.searchParams.get("next")) ?? "/portal") : "/login?error=link";
  return NextResponse.redirect(new URL(dest, url.origin));
}
