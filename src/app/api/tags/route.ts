import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const tag = await prisma.tag.upsert({
    where: { name: body.name },
    update: { color: body.color ?? undefined },
    create: { name: body.name, color: body.color ?? "#3b82f6" },
  });
  return NextResponse.json(tag, { status: 201 });
}
