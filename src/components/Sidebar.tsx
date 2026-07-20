"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◎", color: "text-accent2" },
  { href: "/accounts", label: "Accounts", icon: "▤", color: "text-teal" },
  { href: "/transactions", label: "Transactions", icon: "⇄", color: "text-cyan" },
  { href: "/cashflow", label: "Cash Flow", icon: "📈", color: "text-accent" },
  { href: "/budgets", label: "Budgets", icon: "▦", color: "text-gold" },
  { href: "/bills", label: "Bills & Subscriptions", icon: "⏱", color: "text-orange" },
  { href: "/goals", label: "Goals", icon: "🎯", color: "text-pink" },
  { href: "/networth", label: "Net Worth", icon: "◈", color: "text-accent3" },
  { href: "/investments", label: "Investments", icon: "↗", color: "text-accent" },
  { href: "/forecast", label: "Forecast", icon: "⌖", color: "text-accent2" },
  { href: "/recommendations", label: "Credit Recommendations", icon: "★", color: "text-gold" },
  { href: "/settings/categories", label: "Categories", icon: "🏷", color: "text-muted" },
  { href: "/settings/rules", label: "Rules", icon: "⚙", color: "text-muted" },
  { href: "/settings/sharing", label: "Sharing", icon: "🔗", color: "text-teal" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navList = (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`nav-item ${active ? "nav-item-active" : ""}`}
          >
            <span className={`w-4 text-center text-base ${active ? item.color : "text-muted2"}`}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const header = (
    <div className="px-5 py-6 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-teal flex items-center justify-center text-black font-bold text-lg shadow-glow-green">$</div>
        <div>
          <div className="text-base font-semibold leading-tight">Finance Hub</div>
          <div className="text-xs text-muted2 mt-0.5">your money, one place</div>
        </div>
      </div>
      <button className="lg:hidden text-muted text-xl" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
    </div>
  );

  const footer = (
    <div className="px-3 py-4 border-t border-border">
      <button onClick={logout} className="btn-secondary w-full text-sm">Log out</button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-panel/90 backdrop-blur">
        <button onClick={() => setOpen(true)} className="text-muted text-xl" aria-label="Open menu">☰</button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-teal flex items-center justify-center text-black font-bold text-sm">$</div>
          <span className="text-sm font-semibold">Finance Hub</span>
        </div>
        <span className="w-6" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fadein">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-panel border-r border-border flex flex-col">
            {header}
            {navList}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-panel/60 backdrop-blur min-h-screen flex-col">
        {header}
        {navList}
        {footer}
      </aside>
    </>
  );
}
