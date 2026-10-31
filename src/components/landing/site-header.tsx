import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#who-its-for", label: "Who it's for" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black via-black/70 to-transparent">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-10">
        <Logo />
        <nav className="flex items-center gap-2 md:gap-7" aria-label="Site">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden text-[13px] font-semibold uppercase tracking-[0.025em] text-white/80 transition-colors hover:text-white lg:block"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="px-2 text-[13px] font-semibold uppercase tracking-[0.025em] text-white/80 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <ButtonLink href="/signup">Get started</ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-10">
        <Logo />
        <p>Plans, subscriptions and recurring billing in one place.</p>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-fg">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-fg">
            Create an account
          </Link>
        </div>
      </div>
    </footer>
  );
}
