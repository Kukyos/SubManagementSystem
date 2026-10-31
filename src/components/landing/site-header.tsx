import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const navLink =
  "text-[13px] font-semibold uppercase tracking-[0.025em] text-[#9a9a9a] transition-colors duration-500 ease-[cubic-bezier(0.5,1,0.89,1)] hover:text-white focus-visible:text-white";

// Letters roll up one after another on hover and a copy rolls in from below, as in the reference's nav.
function RollText({ text }: { text: string }) {
  return (
    <span className="roll">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="flex">
        {[...text].map((ch, i) => (
          <span key={i} data-ch={ch} className="roll-char" style={{ transitionDelay: `${i * 18}ms` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}

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
            <Link key={l.href} href={l.href} className={`grow-line hidden lg:block ${navLink}`}>
              <RollText text={l.label} />
            </Link>
          ))}
          <Link href="/login" className={`grow-line mx-2 hidden sm:block ${navLink}`}>
            <RollText text="Sign in" />
          </Link>
          <ButtonLink href="/signup">Get started</ButtonLink>
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-line-strong [&::-webkit-details-marker]:hidden"
            >
              <span aria-hidden className="flex w-4 flex-col gap-1">
                <span className="h-px bg-white transition-transform group-open:translate-y-[2.5px] group-open:rotate-45" />
                <span className="h-px bg-white transition-transform group-open:-translate-y-[2.5px] group-open:-rotate-45" />
              </span>
            </summary>
            <div className="absolute right-0 mt-3 flex w-56 flex-col gap-1 rounded-card border border-line bg-black/95 p-3">
              {[...links, { href: "/login", label: "Sign in" }].map((l) => (
                <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-2.5 ${navLink}`}>
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
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
