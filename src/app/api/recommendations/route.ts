import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCategory, SpendCategory } from "@/lib/categories";
import { CREDIT_CARD_SEED_DATA, scoreCards } from "@/lib/creditCards";

export async function GET() {
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

  return NextResponse.json({
    disclaimer:
      "Informational only, not personalized financial or investment advice. " +
      "Card fees, rates, and bonuses change often and vary by applicant — verify current terms " +
      "directly with the issuer before applying. Reward dollar estimates are rough approximations.",
    spendByCategory,
    transactionCount: transactions.length,
    recommendations: ranked,
  });
}
