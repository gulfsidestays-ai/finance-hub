import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDueDate } from "@/lib/billDetection";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const existing = await prisma.bill.findUnique({ where: { id: params.id } });

  const data: any = {
    name: body.name ?? undefined,
    amount: body.amount != null ? Number(body.amount) : undefined,
    dueDay: body.dueDay != null ? Number(body.dueDay) : undefined,
    category: body.category ?? undefined,
    active: body.active ?? undefined,
    accountId: body.accountId ?? undefined,
    frequency: body.frequency ?? undefined,
    type: body.type ?? undefined,
    nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
  };

  // Mark paid: set lastPaidDate and advance nextDueDate past today.
  if (body.markPaid) {
    const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();
    data.lastPaidDate = paidDate;
    const freq = existing?.frequency ?? null;
    data.nextDueDate = computeNextDueDate(existing?.nextDueDate ?? null, freq as string | null, paidDate);
    // Keep dueDay synced for monthly bills.
    if (!freq || freq === "monthly") {
      data.dueDay = (data.nextDueDate as Date).getDate();
    }
  }

  const bill = await prisma.bill.update({ where: { id: params.id }, data });
  return NextResponse.json(bill);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.bill.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
