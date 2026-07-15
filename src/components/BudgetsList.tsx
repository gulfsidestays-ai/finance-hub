"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatCategory } from "@/lib/format";
import { SPEND_CATEGORIES, SpendCategory } from "@/lib/categories";

type Budget = { id: string; category: string; monthlyLimit: number; spent: number };

export default function BudgetsList({ budgets }: { budgets: Budget[] }) {
  const router = useRouter();
  const [category, setCategory] = useState(SPEND_CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, monthlyLimit: Number(limit) }),
    });
    setBusy(false);
    setLimit("");
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {budgets.length === 0 && <p className="text-muted text-sm">No budgets yet.</p>}
      {budgets.map((b) => {
        const pct = b.monthlyLimit > 0 ? Math.min(100, (b.spent / b.monthlyLimit) * 100) : 0;
        const over = b.spent > b.monthlyLimit;
        return (
          <div key={b.id} className="card">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{formatCategory(b.category)}</span>
              <span className={over ? "text-danger" : "text-muted"}>
                {formatMoney(b.spent)} / {formatMoney(b.monthlyLimit)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div
                className={`h-full ${over ? "bg-danger" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <button
              onClick={() => remove(b.id)}
              className="text-xs text-muted hover:text-danger mt-2"
            >
              Remove budget
            </button>
          </div>
        );
      })}

      <form onSubmit={addBudget} className="card space-y-3">
        <div className="text-sm font-medium">Add a budget</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
            >
              {SPEND_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monthly limit</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving..." : "Add budget"}
        </button>
      </form>
    </div>
  );
}
