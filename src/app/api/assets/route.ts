import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: [{ isLiability: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, isLiability, value, quantity, ticker, notes } = body;
  if (!name || !category || value == null) {
    return NextResponse.json({ error: "name, category, value are required" }, { status: 400 });
  }
  const asset = await prisma.asset.create({
    data: {
      name,
      category,
      isLiability: Boolean(isLiability),
      value: Number(value),
      quantity: quantity != null ? Number(quantity) : null,
      ticker: ticker || null,
      notes: notes || null,
    },
  });
  return NextResponse.json(asset, { status: 201 });
}
