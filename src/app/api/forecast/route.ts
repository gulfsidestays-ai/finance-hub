import { NextRequest, NextResponse } from "next/server";
import { computeForecast } from "@/lib/forecast";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const months = searchParams.get("months") ? Number(searchParams.get("months")) : 12;
  const incomeAdjust = searchParams.get("incomeAdjust") ? Number(searchParams.get("incomeAdjust")) : 0;
  const spendingAdjust = searchParams.get("spendingAdjust") ? Number(searchParams.get("spendingAdjust")) : 0;
  const extraSavings = searchParams.get("extraSavings") ? Number(searchParams.get("extraSavings")) : 0;
  const result = await computeForecast({ months, incomeAdjust, spendingAdjust, extraSavings });
  return NextResponse.json(result);
}
