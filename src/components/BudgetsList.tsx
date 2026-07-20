"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Budget = {
  id: string;
  category: string | null;
  categoryId: string | null;
  categoryRef: { name: string; emoji: string | null } | null;
  monthlyLimit: number;
  rollover: boolean;
  rolloverAmount: number;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  over: boolean;
};

type Group = { id: string; name: string; categories: { id: string; name: string; emoji: string | null }[] };

export default function BudgetsList({ budgets }: { budgets: Budget[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [rollover, setRollover] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setGroups).catch(() => {});
  }, []);

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !limit) return;
    setBusy(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyLimit: Number(limit), rollover }),
    });
    setBusy(false);
    setLimit("");
    setRollover(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {budgets.length === 0 && <p className="text-muted text-sm">No budgets yet. Add one below.</p>}
      {budgets.map((b) => {
        const pct = Math.min(100, b.pct * 100);
        return (
          <div key={b.id} className="card">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">
                {b.categoryRef?.emoji ?? "📦"} {b.categoryRef?.name ?? b.category ?? "Uncategorized"}
                {b.rollover && <span className="ml-2 text-xs text-accent2">rollover</span>}
              </span>
              <span className={b.over ? "text-danger" : "text-muted"}>
                {formatMoney(b.spent)} / {formatMoney(b.limit)}
                {b.rolloverAmount > 0 && <span className="text-xs"> (+{formatMoney(b.rolloverAmount)} rolled)</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div className={`h-full ${b.over ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted">{formatMoney(b.remaining)} remaining</span>
              <button onClick={() => remove(b.id)} className="text-xs text-muted hover:text-danger">Remove</button>
            </div>
          </div>
        );
      })}

      <form onSubmit={addBudget} className="card space-y-3">
        <div className="text-sm font-medium">Add a budget</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Choose…</option>
              {groups.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {g.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monthly limit</label>
            <input className="input" type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} /> Roll over unused budget to next month
        </label>
        <button className="btn-primary" disabled={busy || !categoryId || !limit}>Add budget</button>
      </form>
    </div>
  );
}
