import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavProgress } from "@/components/layout/nav-progress";
import { ValidationBubble } from "@/components/ui/validation-bubble";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://managesubs.vercel.app"),
  title: { default: "Brightloop", template: "%s · Brightloop" },
  description: "Plans, subscriptions and recurring billing in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavProgress />
        {children}
        <ValidationBubble />
      </body>
    </html>
  );
}
