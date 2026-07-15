import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bills = await prisma.bill.findMany({
    where: { active: true },
    orderBy: { dueDay: "asc" },
    include: { account: { select: { name: true } } },
  });
  return NextResponse.json(bills);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, amount, dueDay, category, accountId } = body;

  if (!name || amount == null || dueDay == null) {
    return NextResponse.json({ error: "name, amount, dueDay are required" }, { status: 400 });
  }
  if (dueDay < 1 || dueDay > 31) {
    return NextResponse.json({ error: "dueDay must be between 1 and 31" }, { status: 400 });
  }

  const bill = await prisma.bill.create({
    data: {
      name,
      amount: Number(amount),
      dueDay: Number(dueDay),
      category: category ?? null,
      accountId: accountId || null,
    },
  });
  return NextResponse.json(bill, { status: 201 });
}
