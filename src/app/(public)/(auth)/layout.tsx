import { Logo } from "@/components/brand/logo";
import { ShardField } from "@/components/landing/shard-field";

// Same scene as the landing hero: the loop holds on the right, the form sits
// where the headline was. Under 1024px the loop centres behind the panel.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShardField />
      <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black via-black/70 to-transparent">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center px-6 md:px-10">
          <Logo />
        </div>
      </header>
      <main
        data-shards="loop-right"
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-6 py-28 md:px-10"
      >
        <div className="w-full max-w-[420px] rounded-card border border-line bg-black/75 p-6 backdrop-blur-md sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {children}
        </div>
      </main>
    </>
  );
}
