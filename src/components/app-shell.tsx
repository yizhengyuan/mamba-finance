import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "看板" },
  { href: "/repayments/calendar", label: "日历" },
  { href: "/accounts", label: "账户" },
  { href: "/orders", label: "订单" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_360px_at_12%_-8%,#e2e8f0_0%,#f8fafc_45%,#f5f7fb_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <aside className="sticky top-4 hidden w-64 shrink-0 self-start rounded-2xl border border-white/10 bg-white/85 p-6 shadow-sm md:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mamba</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Finance</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <nav className="mb-4 flex flex-wrap gap-2 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
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
