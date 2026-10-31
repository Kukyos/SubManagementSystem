import Link from "next/link";

// Holding page until the landing design lands (see docs/DESIGN.md).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-zinc-500">Brightloop</p>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Plans, subscriptions and recurring billing in one place.
      </h1>
      <p className="max-w-md text-zinc-600">
        Quote, subscribe, invoice and collect without a single spreadsheet.
      </p>
      <Link href="/login" className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white">
        Sign in
      </Link>
    </main>
  );
}
