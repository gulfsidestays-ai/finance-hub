import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { advanceDate, Frequency } from "@/lib/billDetection";

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

  // Mark paid: set lastPaidDate and schedule the NEXT occurrence one period ahead.
  if (body.markPaid) {
    const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();
    data.lastPaidDate = paidDate;
    const freq = (existing?.frequency as Frequency | null) ?? null;

    let next: Date;
    if (existing?.nextDueDate && freq) {
      // Pay the upcoming occurrence → advance one period, then roll forward
      // past the paid date in case it had fallen behind.
      next = advanceDate(new Date(existing.nextDueDate), freq, 1);
      while (next <= paidDate) next = advanceDate(next, freq, 1);
    } else if (freq) {
      // No seed date: start from paid date and advance one period.
      next = advanceDate(new Date(paidDate), freq, 1);
    } else {
      // Manual monthly bill: next month, same day-of-month as dueDay.
      next = new Date(paidDate);
      next.setMonth(next.getMonth() + 1);
      const dim = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(existing?.dueDay ?? paidDate.getDate(), dim));
    }
    data.nextDueDate = next;
    if (!freq || freq === "monthly") {
      data.dueDay = next.getDate();
    }
  }

  const bill = await prisma.bill.update({ where: { id: params.id }, data });
  return NextResponse.json(bill);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.bill.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
