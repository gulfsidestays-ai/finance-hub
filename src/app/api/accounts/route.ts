import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ isManual: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(accounts);
}

// Manual account creation (e.g. cash, a loan not tracked by Plaid, a house).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, currentBalance, creditLimit, subtype } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      name,
      type,
      subtype: subtype ?? null,
      currentBalance: Number(currentBalance) || 0,
      creditLimit: creditLimit != null ? Number(creditLimit) : null,
      isManual: true,
    },
  });
  return NextResponse.json(account, { status: 201 });
}
