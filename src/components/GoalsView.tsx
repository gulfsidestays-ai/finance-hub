"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Projection = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  startingAmount: number;
  progress: number;
  remaining: number;
  monthlyContribution: number | null;
  targetDate: string | null;
  monthsRemaining: number | null;
  projectedCompletionDate: string | null;
  requiredMonthly: number | null;
  onTrack: boolean | null;
  shortfall: number | null;
  status: string;
  totalInterest?: number;
  linkedAccountName?: string | null;
};

type Account = { id: string; name: string; type: string; currentBalance: number };

export default function GoalsView() {
  const router = useRouter();
  const [goals, setGoals] = useState<Projection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("savings");
  const [contribId, setContribId] = useState<string | null>(null);
  const [contribAmt, setContribAmt] = useState("");

  const load = useCallback(async () => {
    const [g, a] = await Promise.all([fetch("/api/goals"), fetch("/api/accounts")]);
    if (g.ok) setGoals(await g.json());
    if (a.ok) setAccounts(await a.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: any = {
      name: f.get("name"),
      type: f.get("type"),
      targetAmount: Number(f.get("targetAmount")),
      currentAmount: Number(f.get("currentAmount") || 0),
      startingAmount: f.get("startingAmount") ? Number(f.get("startingAmount")) : null,
      monthlyContribution: f.get("monthlyContribution") ? Number(f.get("monthlyContribution")) : null,
      targetDate: f.get("targetDate") || null,
      linkedAccountId: f.get("linkedAccountId") || null,
      interestRate: f.get("interestRate") ? Number(f.get("interestRate")) : null,
    };
    if (body.type === "debt" && !body.startingAmount && !body.linkedAccountId) {
      body.startingAmount = body.currentAmount;
    }
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    await load();
    router.refresh();
  }

  async function contribute(id: string) {
    const amt = Number(contribAmt);
    if (!amt) return;
    await fetch(`/api/goals/${id}/contribute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt }) });
    setContribId(null); setContribAmt("");
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  const savings = goals.filter((g) => g.type === "savings");
  const debt = goals.filter((g) => g.type === "debt");

  function statusBadge(g: Projection) {
    const map: Record<string, { label: string; cls: string }> = {
      on_track: { label: "On track", cls: "bg-accent/20 text-accent" },
      behind: { label: "Behind", cls: "bg-danger/20 text-danger" },
      ahead: { label: "Ahead", cls: "bg-accent/20 text-accent" },
      complete: { label: "Complete", cls: "bg-accent/20 text-accent" },
      increase_payment: { label: "Increase payment", cls: "bg-danger/20 text-danger" },
      no_plan: { label: "No plan", cls: "bg-panel2 text-muted" },
    };
    const s = map[g.status] || map.no_plan;
    return <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
  }

  const Card = ({ g }: { g: Projection }) => {
    const isDebt = g.type === "debt";
    return (
      <div className="card p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-medium">{g.name}</div>
            <div className="text-xs text-muted">
              {isDebt ? "Debt payoff" : "Savings"}{g.linkedAccountName ? ` · ${g.linkedAccountName}` : ""}
            </div>
          </div>
          {statusBadge(g)}
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">{isDebt ? "Remaining" : "Saved"}</span>
          <span>{formatMoney(isDebt ? g.remaining : g.currentAmount)} / {formatMoney(g.targetAmount)}</span>
        </div>
        <div className="h-2 rounded-full bg-panel2 overflow-hidden mb-3">
          <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round(g.progress * 100)}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
          <div>
            <div className="uppercase tracking-wide">{isDebt ? "Monthly payment" : "Monthly contribution"}</div>
            <div className="text-white">{g.monthlyContribution ? formatMoney(g.monthlyContribution) : "—"}</div>
          </div>
          <div>
            <div className="uppercase tracking-wide">{isDebt ? "Payoff date" : "Completion"}</div>
            <div className="text-white">{g.projectedCompletionDate ? new Date(g.projectedCompletionDate).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—"}</div>
          </div>
          {g.targetDate && (
            <div>
              <div className="uppercase tracking-wide">Required monthly</div>
              <div className={g.shortfall && g.shortfall > 0 ? "text-danger" : "text-white"}>{g.requiredMonthly ? formatMoney(g.requiredMonthly) : "—"}</div>
            </div>
          )}
          {isDebt && g.totalInterest != null && (
            <div>
              <div className="uppercase tracking-wide">Total interest</div>
              <div className="text-warn">{formatMoney(g.totalInterest)}</div>
            </div>
          )}
        </div>
        {g.monthsRemaining != null && (
          <div className="text-xs text-muted mt-2">{g.monthsRemaining} months{isDebt ? " to payoff" : " to goal"}</div>
        )}
        <div className="flex gap-3 mt-3">
          {!isDebt && <button className="text-xs text-accent2 hover:underline" onClick={() => setContribId(contribId === g.id ? null : g.id)}>+ Contribute</button>}
          <button className="text-xs text-danger hover:underline" onClick={() => remove(g.id)}>Delete</button>
        </div>
        {contribId === g.id && (
          <div className="flex gap-2 mt-2">
            <input className="input py-1 text-xs w-28" type="number" placeholder="amount" value={contribAmt} onChange={(e) => setContribAmt(e.target.value)} />
            <button className="btn-secondary text-xs" onClick={() => contribute(g.id)}>Add</button>
          </div>
        )}
      </div>
    );
  };

  const debtAccounts = accounts.filter((a) => ["credit_card", "loan"].includes(a.type));
  const savingsAccounts = accounts.filter((a) => ["checking", "savings"].includes(a.type));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">Track savings targets and debt payoff with live projections.</p>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>+ New goal</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input sm:col-span-2" name="name" placeholder="Goal name (e.g. Emergency Fund)" required />
          <select className="input" name="type" onChange={(e) => setFormType(e.target.value)}>
            <option value="savings">Savings</option>
            <option value="debt">Debt payoff</option>
          </select>
          <input className="input" name="targetAmount" type="number" step="0.01" placeholder={formType === "debt" ? "Target balance (0)" : "Target amount"} required />
          <input className="input" name="currentAmount" type="number" step="0.01" placeholder={formType === "debt" ? "Current balance" : "Current saved"} />
          <input className="input" name="monthlyContribution" type="number" step="0.01" placeholder="Monthly amt" />
          <input className="input" name="startingAmount" type="number" step="0.01" placeholder="Starting (optional)" />
          <input className="input" name="targetDate" type="date" />
          <input className="input" name="interestRate" type="number" step="0.01" placeholder="APR % (debt)" />
          <select className="input sm:col-span-3" name="linkedAccountId" defaultValue="">
            <option value="">No linked account</option>
            {(formType === "debt" ? debtAccounts : savingsAccounts).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.currentBalance)})</option>
            ))}
          </select>
          <button className="btn-primary sm:col-span-3">Create goal</button>
        </form>
      )}

      {savings.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Savings goals</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{savings.map((g) => <Card key={g.id} g={g} />)}</div>
        </div>
      )}
      {debt.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Debt payoff</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{debt.map((g) => <Card key={g.id} g={g} />)}</div>
        </div>
      )}
      {goals.length === 0 && <p className="text-muted text-sm">No goals yet. Create one to start tracking.</p>}
    </div>
  );
}
