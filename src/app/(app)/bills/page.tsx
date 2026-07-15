import { prisma } from "@/lib/prisma";
import BillsList from "@/components/BillsList";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const bills = await prisma.bill.findMany({
    where: { active: true },
    orderBy: { dueDay: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bills & Subscriptions</h1>
        <p className="text-muted text-sm mt-1">Recurring payments and when they're due each month.</p>
      </div>
      <BillsList bills={bills} />
    </div>
  );
}
