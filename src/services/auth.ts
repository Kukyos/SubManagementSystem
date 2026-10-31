import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { UserRole } from "@/types/models";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  customerId: string | null;
};

// One lookup per request, however many components ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  let customerId: string | null = null;
  if (profile.role === "customer") {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    customerId = customer?.id ?? null;
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name,
    customerId,
  };
});

export function homeFor(role: UserRole) {
  return role === "customer" ? "/portal" : "/dashboard";
}

// Use at the top of a layout or page. Signed-out users go to login; signed-in
// users with the wrong role go to their own home.
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

// Only same-site paths, so a crafted ?next= can't send people elsewhere.
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

// Finishes an email link (sign-up confirmation, password reset). Supports both
// the default ?code= links and ?token_hash= links from custom email templates.
export async function completeAuthLink(params: URLSearchParams) {
  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (code) return !(await supabase.auth.exchangeCodeForSession(code)).error;
  if (tokenHash && type) return !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  return false;
}

export async function listTeam() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .in("role", ["admin", "staff"])
    .order("role")
    .order("full_name");
  if (error) throw new Error(error.message);
  return data;
}
