import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading, AuthSwitch, SignUpForm, switchLink } from "@/components/auth/forms";
import { getCurrentUser, homeFor } from "@/services/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <>
      <AuthHeading
        eyebrow="Customer account"
        title="Create your account"
        lead="See your subscriptions, download every invoice and pay online. Team accounts are added by an admin."
      />
      <SignUpForm />
      <AuthSwitch>
        Already have an account?{" "}
        <Link href="/login" className={switchLink}>
          Sign in
        </Link>
      </AuthSwitch>
    </>
  );
}
