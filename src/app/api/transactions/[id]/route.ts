import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/transactions/[id] — update category, notes, reviewed, tags, amount, name, date
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const k of ["name", "merchantName", "amount", "notes", "date"]) {
    if (body[k] !== undefined) data[k] = k === "amount" ? Number(body[k]) : k === "date" ? new Date(body[k]) : body[k];
  }
  if (body.reviewed !== undefined) data.reviewed = body.reviewed;

  // Category assignment — set both categoryId and the legacy category name string.
  if (body.categoryId !== undefined) {
    if (body.categoryId === null) {
      data.categoryId = null;
      data.category = null;
    } else {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (cat) {
        data.categoryId = cat.id;
        data.category = cat.name;
      }
    }
  } else if (body.category !== undefined) {
    data.category = body.category;
  }

  const updated = await prisma.transaction.update({ where: { id: params.id }, data });

  // Tags sync: if body.tags (array of names) provided, replace tags
  if (Array.isArray(body.tags)) {
    await prisma.transactionTag.deleteMany({ where: { transactionId: params.id } });
    for (const name of body.tags as string[]) {
      const n = String(name).trim();
      if (!n) continue;
      const tag = await prisma.tag.upsert({ where: { name: n }, update: {}, create: { name: n } });
      await prisma.transactionTag.upsert({
        where: { transactionId_tagId: { transactionId: params.id, tagId: tag.id } },
        update: {},
        create: { transactionId: params.id, tagId: tag.id },
      });
    }
  }

  const fresh = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { categoryRef: true, tags: { include: { tag: true } }, splits: { include: { category: true } } },
  });
  return NextResponse.json(fresh);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
