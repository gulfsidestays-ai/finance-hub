import { NextResponse } from "next/server";
import { detectRecurringBills } from "@/lib/billDetection";

// POST /api/bills/detect — scan transactions and upsert detected recurring bills
export async function POST() {
  const result = await detectRecurringBills();
  return NextResponse.json(result);
}
