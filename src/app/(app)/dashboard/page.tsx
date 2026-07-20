import { prisma } from "@/lib/prisma";
import { computeNetWorth } from "@/lib/networth";
import { formatMoney, formatCategory } from "@/lib/format";
import NetWorthChart from "@/components/NetWorthChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [nw, recentTxns, upcomingBills, accountCount] = await Promise.all([
    computeNetWorth(),
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { account: { select: { name: true } } },
    }),
    prisma.bill.findMany({ where: { active: true }, orderBy: { dueDay: "asc" }, take: 5 }),
    prisma.account.count(),
  ]);
  const { totalAssets, totalLiabilities, netWorth, history } = nw;

  const trend = history.length >= 2 ? netWorth - history[0].netWorth : 0;
  const trendPct = history.length >= 2 && history[0].netWorth !== 0 ? (trend / Math.abs(history[0].netWorth)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Your whole financial picture, at a glance.</p>
      </div>

      {/* Hero net worth card */}
      <div className="card-hero bg-hero-networth">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="text-sm text-muted">Net worth</div>
            <div className="text-4xl font-semibold tnum mt-1">{formatMoney(netWorth)}</div>
            {history.length >= 2 && (
              <div className="text-sm mt-2">
                <span className={trend >= 0 ? "stat-up" : "stat-down"}>
                  {trend >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(trend))} ({trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%)
                </span>
                <span className="text-muted ml-2">all time</span>
              </div>
            )}
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wide">Assets</div>
              <div className="text-lg font-semibold text-accent tnum">{formatMoney(totalAssets)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wide">Liabilities</div>
              <div className="text-lg font-semibold text-danger tnum">{formatMoney(totalLiabilities)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-hero-blue">
          <div className="text-sm text-muted">Assets</div>
          <div className="text-2xl font-semibold text-accent tnum mt-1">{formatMoney(totalAssets)}</div>
        </div>
        <div className="card bg-hero-rose">
          <div className="text-sm text-muted">Liabilities</div>
          <div className="text-2xl font-semibold text-danger tnum mt-1">{formatMoney(totalLiabilities)}</div>
        </div>
        <div className="card bg-hero-purple">
          <div className="text-sm text-muted">Accounts tracked</div>
          <div className="text-2xl font-semibold text-accent3 tnum mt-1">{accountCount}</div>
        </div>
      </div>

      {accountCount === 0 && (
        <div className="card border-accent2/40 bg-hero-blue">
          <p className="text-sm">
            No accounts yet.{" "}
            <a href="/accounts" className="text-accent2 underline">
              Connect a bank via Plaid or add one manually
            </a>{" "}
            to start tracking your net worth.
          </p>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-medium">Net worth over time</div>
        </div>
        <NetWorthChart history={history.map((h) => ({ date: h.date.toISOString(), netWorth: h.netWorth }))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm font-medium mb-3">Recent transactions</div>
          {recentTxns.length === 0 && <p className="text-muted text-sm">No transactions yet.</p>}
          <ul className="space-y-1">
            {recentTxns.map((t) => (
              <li key={t.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="truncate">{t.name}</div>
                  <div className="text-muted text-xs">
                    {t.account.name} · {formatCategory(t.category)}
                  </div>
                </div>
                <div className={`tnum font-medium ml-3 ${t.amount > 0 ? "text-white" : "text-accent"}`}>
                  {formatMoney(-t.amount)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="text-sm font-medium mb-3">Upcoming bills</div>
          {upcomingBills.length === 0 && (
            <p className="text-muted text-sm">
              No bills tracked yet. Add recurring bills on the{" "}
              <a href="/bills" className="text-accent2 underline">
                Bills page
              </a>
              .
            </p>
          )}
          <ul className="space-y-1">
            {upcomingBills.map((b) => (
              <li key={b.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-orange" />
                  <span>{b.name}</span>
                </div>
                <div className="text-muted tnum">Day {b.dueDay} · {formatMoney(b.amount)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
