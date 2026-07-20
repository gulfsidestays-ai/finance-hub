"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◎" },
  { href: "/accounts", label: "Accounts", icon: "▤" },
  { href: "/transactions", label: "Transactions", icon: "⇄" },
  { href: "/cashflow", label: "Cash Flow", icon: "📈" },
  { href: "/budgets", label: "Budgets", icon: "▦" },
  { href: "/bills", label: "Bills & Subscriptions", icon: "⏱" },
  { href: "/goals", label: "Goals", icon: "🎯" },
  { href: "/networth", label: "Net Worth", icon: "◈" },
  { href: "/investments", label: "Investments", icon: "↗" },
  { href: "/forecast", label: "Forecast", icon: "⌖" },
  { href: "/recommendations", label: "Credit Recommendations", icon: "★" },
  { href: "/settings/categories", label: "Categories", icon: "🏷" },
  { href: "/settings/rules", label: "Rules", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-panel min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-border">
        <div className="text-lg font-semibold">Finance Hub</div>
        <div className="text-xs text-muted mt-0.5">your money, one place</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-panel2 text-white"
                  : "text-muted hover:bg-panel2 hover:text-white"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <button onClick={logout} className="btn-secondary w-full text-sm">
          Log out
        </button>
      </div>
    </aside>
  );
}
