import { NextRequest, NextResponse } from "next/server";
import { projectCalendar } from "@/lib/billDetection";

// GET /api/bills/calendar?month=YYYY-MM — projected bill instances for a month
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (y && m) { year = y; month = m; }
  }
  const instances = await projectCalendar(year, month);
  return NextResponse.json({ year, month, instances });
}
