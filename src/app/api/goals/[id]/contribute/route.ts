import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/goals/[id]/contribute — add (or subtract, if negative) to currentAmount
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || isNaN(amount)) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }
  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: { currentAmount: goal.currentAmount + amount },
  });
  return NextResponse.json(updated);
}
