import { prisma } from "./prisma";

const LIABILITY_TYPES = ["credit_card", "loan"];

export async function computeNetWorth() {
  const [accounts, assets] = await Promise.all([
    prisma.account.findMany(),
    prisma.asset.findMany(),
  ]);

  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const a of accounts) {
    if (LIABILITY_TYPES.includes(a.type)) {
      totalLiabilities += a.currentBalance;
    } else {
      totalAssets += a.currentBalance;
    }
  }
  // Manual assets/liabilities (property, vehicles, crypto, manual loans, etc.)
  for (const a of assets) {
    if (a.isLiability) totalLiabilities += a.value;
    else totalAssets += a.value;
  }
  const netWorth = totalAssets - totalLiabilities;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const existing = await prisma.netWorthSnapshot.findFirst({
    where: { date: { gte: startOfDay } },
  });
  if (!existing) {
    await prisma.netWorthSnapshot.create({ data: { totalAssets, totalLiabilities, netWorth } });
  } else {
    await prisma.netWorthSnapshot.update({
      where: { id: existing.id },
      data: { totalAssets, totalLiabilities, netWorth },
    });
  }

  const history = await prisma.netWorthSnapshot.findMany({
    orderBy: { date: "asc" },
    take: 180,
  });

  return { totalAssets, totalLiabilities, netWorth, history, accounts, assets };
}
