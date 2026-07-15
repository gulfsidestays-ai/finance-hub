import { prisma } from "@/lib/prisma";
import { formatMoney, formatCategory } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { account: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-muted text-sm mt-1">Most recent 200, newest first.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {t.name}
                  {t.pending && <span className="ml-2 text-xs text-warn">pending</span>}
                </td>
                <td className="px-4 py-3 text-muted">{t.account.name}</td>
                <td className="px-4 py-3 text-muted">{formatCategory(t.category)}</td>
                <td className={`px-4 py-3 text-right ${t.amount > 0 ? "" : "text-accent"}`}>
                  {formatMoney(-t.amount)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No transactions yet. Connect an account or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
