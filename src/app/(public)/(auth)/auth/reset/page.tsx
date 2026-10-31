import type { Metadata } from "next";
import { AuthHeading, ExpiredLink, ResetPasswordForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/services/auth";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the reset email, after /auth/callback has signed the person in.
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <AuthHeading
          eyebrow="Account recovery"
          title="This link has expired"
          lead="Reset links work once and expire after an hour. Ask for a new one and use the latest email."
        />
        <ExpiredLink />
      </>
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow="Account recovery"
        title="Choose a new password"
        lead={<>For {user.email}. You&apos;ll stay signed in once it&apos;s saved.</>}
      />
      <ResetPasswordForm />
    </>
  );
}
