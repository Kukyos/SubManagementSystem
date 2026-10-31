import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading, AuthSwitch, Notice, SignInForm, switchLink } from "@/components/auth/forms";
import { getCurrentUser, homeFor, safeNext } from "@/services/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next, error } = await searchParams;

  return (
    <>
      <AuthHeading
        eyebrow="Welcome back"
        title="Sign in"
        lead="Subscriptions, invoices and billing runs, right where you left them."
      />
      {error === "link" && (
        <div className="mb-5">
          <Notice>That link has expired or was already used. Sign in, or ask for a new reset link.</Notice>
        </div>
      )}
      <SignInForm next={safeNext(next) ?? undefined} />
      <AuthSwitch>
        New to Brightloop?{" "}
        <Link href="/signup" className={switchLink}>
          Create an account
        </Link>
      </AuthSwitch>
    </>
  );
}
