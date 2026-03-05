import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "看板" },
  { href: "/repayments/calendar", label: "日历" },
  { href: "/accounts", label: "账户" },
  { href: "/orders", label: "订单" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_20%_-10%,#1e293b_0%,#101727_45%,#0a0f1c_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 border-r border-white/10 bg-black/20 p-6 md:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/90">Mamba</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Finance</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <nav className="mb-4 flex flex-wrap gap-2 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
