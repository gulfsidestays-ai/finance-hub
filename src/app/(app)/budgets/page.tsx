import { computeBudgets } from "@/lib/budgets";
import BudgetsList from "@/components/BudgetsList";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const budgets = await computeBudgets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <p className="text-muted text-sm mt-1">Monthly limits by category, tracked against real spending.</p>
      </div>
      <BudgetsList budgets={budgets} />
    </div>
  );
}
