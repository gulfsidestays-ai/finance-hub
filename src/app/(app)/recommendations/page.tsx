import { prisma } from "@/lib/prisma";
import { normalizeCategory, SpendCategory } from "@/lib/categories";
import { CREDIT_CARD_SEED_DATA, scoreCards } from "@/lib/creditCards";
import { formatMoney, formatCategory } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: twelveMonthsAgo }, amount: { gt: 0 } },
    select: { amount: true, category: true },
  });

  const spendByCategory: Partial<Record<SpendCategory, number>> = {};
  for (const t of transactions) {
    const cat = normalizeCategory(t.category);
    spendByCategory[cat] = (spendByCategory[cat] ?? 0) + t.amount;
  }

  const ranked = scoreCards(CREDIT_CARD_SEED_DATA, spendByCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credit Card Recommendations</h1>
        <p className="text-muted text-sm mt-1">
          Ranked by estimated net annual value against your last 12 months of spending.
        </p>
      </div>

      <div className="card border-warn/40 text-sm">
        <strong className="text-warn">Not financial advice.</strong> This is a rough, rules-based
        estimate from a small reference dataset — not real-time issuer data. Card fees, rates, and
        bonuses vary by applicant and change often. Verify current terms directly with the issuer
        before applying, and edit{" "}
        <code className="text-muted">src/lib/creditCards.ts</code> with real, current offers you've
        checked yourself.
      </div>

      {transactions.length === 0 && (
        <div className="card">
          <p className="text-sm text-muted">
            No transaction history yet, so rankings below assume no spending in any category — connect
            an account and sync transactions for real, personalized rankings.
          </p>
        </div>
      )}

      {Object.keys(spendByCategory).length > 0 && (
        <div className="card">
          <div className="text-sm text-muted mb-2">Your trailing 12-month spend by category</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(spendByCategory).map(([cat, amt]) => (
              <span key={cat} className="text-xs bg-panel2 border border-border rounded-full px-3 py-1">
                {formatCategory(cat)}: {formatMoney(amt ?? 0)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {ranked.map((card, i) => (
          <div key={card.name} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted">
                  #{i + 1} · {card.issuer}
                </div>
                <div className="text-lg font-semibold">{card.name}</div>
                <div className="text-xs text-muted mt-1">
                  Annual fee: {formatMoney(card.annualFee)}
                  {card.signupBonus ? ` · ${card.signupBonus}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">Est. net annual value</div>
                <div
                  className={`text-xl font-semibold ${
                    card.netAnnualValue >= 0 ? "text-accent" : "text-danger"
                  }`}
                >
                  {formatMoney(card.netAnnualValue)}
                </div>
              </div>
            </div>
            {card.notes && <p className="text-sm text-muted mt-3">{card.notes}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(card.rewards).map(([cat, rate]) => (
                <span key={cat} className="text-xs bg-panel2 border border-border rounded-full px-3 py-1">
                  {formatCategory(cat)}: {rate}x
                </span>
              ))}
            </div>
            {card.applyUrl && (
              <a
                href={card.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent2 underline mt-3 inline-block"
              >
                Compare current offers →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
