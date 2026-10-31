"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { passwordProblem } from "@/lib/password";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser, homeFor, safeNext } from "@/services/auth";

export type AuthFormState = {
  error?: string;
  sent?: boolean;
  values?: Record<string, string>;
} | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// Links in auth emails come back to whichever deployment sent them.
async function siteUrl() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const rateLimited = "Too many attempts. Wait a minute and try again.";

export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email first. The link is in the message we sent when you signed up."
        : error.code === "over_request_rate_limit"
          ? rateLimited
          : "That email and password don't match an account.";
    return { error: message, values: { email } };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(safeNext(formData.get("next")) ?? homeFor(profile?.role ?? "customer"));
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    company: text(formData, "company"),
  };
  const password = String(formData.get("password") ?? "");

  if (!values.fullName) return { error: "Tell us your name.", values };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: {
      data: { full_name: values.fullName, company: values.company },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  // With email confirmation on, Supabase answers a repeat sign-up with a user
  // that has no identities instead of an error.
  if (error?.code === "user_already_exists" || (!error && !data.user?.identities?.length)) {
    return { error: "An account with this email already exists. Sign in instead.", values };
  }
  if (error) {
    const message =
      error.code === "weak_password"
        ? "That password is too easy to guess. Try a longer one."
        : error.code?.startsWith("over_")
          ? rateLimited
          : error.code === "email_address_invalid"
            ? "That email address doesn't look right."
            : "We couldn't create your account. Try again in a moment.";
    return { error: message, values };
  }

  return { sent: true, values };
}

export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/reset`,
  });

  // Same answer whether or not the account exists.
  if (error?.code?.startsWith("over_")) return { error: rateLimited, values: { email } };
  return { sent: true, values: { email } };
}

export async function updatePassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== formData.get("confirm")) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "That's your current password. Choose a new one."
        : error.code === "session_not_found" || error.code === "session_expired"
          ? "This reset link has expired. Request a new one."
          : "We couldn't change your password. Try again in a moment.";
    return { error: message };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(homeFor(profile?.role ?? "customer"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type StaffFormState = { ok?: boolean; error?: string; values?: Record<string, string> } | null;

// Admin only. The role goes in app_metadata at creation, so the sign-up trigger
// makes a staff profile (and no customer record) from the start.
export async function inviteStaff(_: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const values = { fullName: text(formData, "fullName"), email: text(formData, "email").toLowerCase() };
  const password = String(formData.get("password") ?? "");
  const fail = (error: string) => ({ error, values });

  const user = await getCurrentUser();
  if (user?.role !== "admin") return fail("Only an admin can add staff.");
  if (!values.fullName) return fail("Give their full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return fail("That email doesn't look right.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const svc = createServiceClient();
  const { data, error } = await svc.auth.admin.createUser({
    email: values.email,
    password,
    email_confirm: true,
    app_metadata: { role: "staff" },
    user_metadata: { full_name: values.fullName },
  });
  if (error?.code === "email_exists") return fail(`${values.email} already has an account.`);
  if (error) return fail("We couldn't add them. Try again in a moment.");

  // Auth attaches app_metadata after the insert, so the sign-up trigger files them as a customer.
  const id = data.user.id;
  const promoted = await svc.from("profiles").update({ role: "staff" }).eq("id", id);
  const unlinked = await svc.from("customers").delete().eq("user_id", id);
  if (promoted.error || unlinked.error) return fail("They were added but not as staff. Try again in a moment.");

  revalidatePath("/settings");
  return { ok: true, values: { email: values.email } };
}
