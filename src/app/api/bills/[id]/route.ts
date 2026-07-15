import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const bill = await prisma.bill.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      amount: body.amount != null ? Number(body.amount) : undefined,
      dueDay: body.dueDay != null ? Number(body.dueDay) : undefined,
      active: body.active ?? undefined,
      lastPaidDate: body.markPaid ? new Date() : undefined,
    },
  });
  return NextResponse.json(bill);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.bill.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
