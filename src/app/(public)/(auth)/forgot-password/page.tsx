import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthSwitch, ForgotPasswordForm, switchLink } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        eyebrow="Account recovery"
        title="Reset your password"
        lead="Enter the email you signed up with and we'll send a link to choose a new one."
      />
      <ForgotPasswordForm />
      <AuthSwitch>
        Remembered it?{" "}
        <Link href="/login" className={switchLink}>
          Sign in
        </Link>
      </AuthSwitch>
    </>
  );
}
