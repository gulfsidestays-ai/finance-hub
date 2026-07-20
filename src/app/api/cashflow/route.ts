import { NextResponse } from "next/server";
import { computeCashFlow } from "@/lib/cashflow";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const months = Number(searchParams.get("months") || 6);
  const data = await computeCashFlow(Math.min(Math.max(months, 1), 24));
  return NextResponse.json(data);
}
