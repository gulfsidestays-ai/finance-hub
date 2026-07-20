import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRulesToTransaction } from "@/lib/rules";

// GET /api/transactions?search=&category=&accountId=&tagId=&reviewed=&month=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 200), 1000);
  const search = searchParams.get("search")?.toLowerCase() || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const accountId = searchParams.get("accountId") || undefined;
  const reviewed = searchParams.get("reviewed"); // "true" | "false" | undefined
  const month = searchParams.get("month") || undefined; // YYYY-MM

  const where: any = {};
  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId;
  if (reviewed === "true") where.reviewed = true;
  if (reviewed === "false") where.reviewed = false;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    where.date = { gte: start, lt: end };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { merchantName: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    include: {
      account: { select: { name: true, type: true } },
      categoryRef: { select: { name: true, emoji: true } },
      tags: { include: { tag: true } },
      splits: { include: { category: { select: { name: true, emoji: true } } } },
    },
  });
  return NextResponse.json(transactions);
}

// POST /api/transactions — manual entry; rules auto-apply afterwards
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accountId, name, amount, category, categoryId, date, merchantName, reviewed } = body;

  if (!accountId || !name || amount == null) {
    return NextResponse.json({ error: "accountId, name, amount are required" }, { status: 400 });
  }

  const data: any = {
    accountId,
    name,
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    merchantName: merchantName ?? null,
    reviewed: reviewed ?? false,
  };

  // Resolve the category name from categoryId when provided, else use raw category
  let resolvedName = category ?? null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    data.categoryId = categoryId;
    if (cat) resolvedName = cat.name;
  }
  data.category = resolvedName ?? "Uncategorized";

  const txn = await prisma.transaction.create({ data });
  await applyRulesToTransaction(txn.id);

  const fresh = await prisma.transaction.findUnique({
    where: { id: txn.id },
    include: { categoryRef: true, tags: { include: { tag: true } } },
  });
  return NextResponse.json(fresh, { status: 201 });
}
