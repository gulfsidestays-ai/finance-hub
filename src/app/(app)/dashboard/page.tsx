import { prisma } from "@/lib/prisma";
import { computeNetWorth } from "@/lib/networth";
import { formatMoney, formatCategory } from "@/lib/format";
import NetWorthChart from "@/components/NetWorthChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ totalAssets, totalLiabilities, netWorth, history }, recentTxns, upcomingBills, accountCount] =
    await Promise.all([
      computeNetWorth(),
      prisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 8,
        include: { account: { select: { name: true } } },
      }),
      prisma.bill.findMany({ where: { active: true }, orderBy: { dueDay: "asc" }, take: 5 }),
      prisma.account.count(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Your whole financial picture, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-muted mb-1">Net worth</div>
          <div className="text-3xl font-semibold">{formatMoney(netWorth)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-muted mb-1">Total assets</div>
          <div className="text-3xl font-semibold text-accent">{formatMoney(totalAssets)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-muted mb-1">Total liabilities</div>
          <div className="text-3xl font-semibold text-danger">{formatMoney(totalLiabilities)}</div>
        </div>
      </div>

      {accountCount === 0 && (
        <div className="card border-accent2/40">
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
        <div className="text-sm text-muted mb-3">Net worth over time</div>
        <NetWorthChart history={history.map((h) => ({ date: h.date.toISOString(), netWorth: h.netWorth }))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-muted mb-3">Recent transactions</div>
          {recentTxns.length === 0 && <p className="text-muted text-sm">No transactions yet.</p>}
          <ul className="space-y-2">
            {recentTxns.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <div>
                  <div>{t.name}</div>
                  <div className="text-muted text-xs">
                    {t.account.name} · {formatCategory(t.category)}
                  </div>
                </div>
                <div className={t.amount > 0 ? "text-white" : "text-accent"}>
                  {formatMoney(-t.amount)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="text-sm text-muted mb-3">Upcoming bills</div>
          {upcomingBills.length === 0 && (
            <p className="text-muted text-sm">
              No bills tracked yet. Add recurring bills on the{" "}
              <a href="/bills" className="text-accent2 underline">
                Bills page
              </a>
              .
            </p>
          )}
          <ul className="space-y-2">
            {upcomingBills.map((b) => (
              <li key={b.id} className="flex justify-between text-sm">
                <div>{b.name}</div>
                <div className="text-muted">Day {b.dueDay} · {formatMoney(b.amount)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
