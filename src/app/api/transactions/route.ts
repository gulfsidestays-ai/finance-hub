import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 100);
  const category = searchParams.get("category") || undefined;
  const accountId = searchParams.get("accountId") || undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      category: category || undefined,
      accountId: accountId || undefined,
    },
    orderBy: { date: "desc" },
    take: Math.min(limit, 500),
    include: { account: { select: { name: true, type: true } } },
  });
  return NextResponse.json(transactions);
}

// Manual transaction entry (for cash accounts or anything not linked via Plaid).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accountId, name, amount, category, date } = body;

  if (!accountId || !name || amount == null) {
    return NextResponse.json({ error: "accountId, name, amount are required" }, { status: 400 });
  }

  const txn = await prisma.transaction.create({
    data: {
      accountId,
      name,
      amount: Number(amount),
      category: category ?? "Uncategorized",
      date: date ? new Date(date) : new Date(),
    },
  });
  return NextResponse.json(txn, { status: 201 });
}
