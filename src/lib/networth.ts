import { prisma } from "./prisma";

const LIABILITY_TYPES = ["credit_card", "loan"];

export async function computeNetWorth() {
  const accounts = await prisma.account.findMany();

  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const a of accounts) {
    if (LIABILITY_TYPES.includes(a.type)) {
      totalLiabilities += a.currentBalance;
    } else {
      totalAssets += a.currentBalance;
    }
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

  return { totalAssets, totalLiabilities, netWorth, history, accounts };
}
