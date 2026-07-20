import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectAllGoals } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET() {
  const projections = await projectAllGoals();
  return NextResponse.json(projections);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, targetAmount, currentAmount, startingAmount, targetDate, monthlyContribution, linkedAccountId, interestRate } = body;
  if (!name || targetAmount == null) {
    return NextResponse.json({ error: "name and targetAmount are required" }, { status: 400 });
  }
  const goal = await prisma.goal.create({
    data: {
      name,
      type: type ?? "savings",
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      startingAmount: startingAmount != null ? Number(startingAmount) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      monthlyContribution: monthlyContribution != null ? Number(monthlyContribution) : null,
      linkedAccountId: linkedAccountId || null,
      interestRate: interestRate != null ? Number(interestRate) : null,
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
