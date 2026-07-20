import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/transactions/[id]/split — list splits for a transaction
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const splits = await prisma.transactionSplit.findMany({
    where: { transactionId: params.id },
    include: { category: { select: { name: true, emoji: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(splits);
}

// POST /api/transactions/[id]/split — add a split { amount, categoryId?, notes? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (body.amount == null) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }
  const split = await prisma.transactionSplit.create({
    data: {
      transactionId: params.id,
      amount: Number(body.amount),
      categoryId: body.categoryId ?? null,
      notes: body.notes ?? null,
    },
    include: { category: { select: { name: true, emoji: true } } },
  });
  return NextResponse.json(split, { status: 201 });
}

// DELETE /api/transactions/[id]/split?splitId=...
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const splitId = searchParams.get("splitId");
  if (!splitId) return NextResponse.json({ error: "splitId is required" }, { status: 400 });
  await prisma.transactionSplit.delete({ where: { id: splitId } });
  return NextResponse.json({ ok: true });
}
