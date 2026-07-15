"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Bill = { id: string; name: string; amount: number; dueDay: number; category: string | null };

export default function BillsList({ bills }: { bills: Bill[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [busy, setBusy] = useState(false);

  async function addBill(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: Number(amount), dueDay: Number(dueDay) }),
    });
    setBusy(false);
    setName("");
    setAmount("");
    setDueDay("1");
    router.refresh();
  }

  async function markPaid(id: string) {
    await fetch(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markPaid: true }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const today = new Date().getDate();

  return (
    <div className="space-y-4">
      {bills.length === 0 && <p className="text-muted text-sm">No bills tracked yet.</p>}
      {bills.map((b) => {
        const dueSoon = b.dueDay >= today && b.dueDay - today <= 5;
        return (
          <div key={b.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{b.name}</div>
              <div className={`text-xs ${dueSoon ? "text-warn" : "text-muted"}`}>
                Due day {b.dueDay} of each month
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-semibold">{formatMoney(b.amount)}</div>
              <button onClick={() => markPaid(b.id)} className="text-xs text-accent hover:underline">
                Mark paid
              </button>
              <button onClick={() => remove(b.id)} className="text-xs text-muted hover:text-danger">
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <form onSubmit={addBill} className="card space-y-3">
        <div className="text-sm font-medium">Add a bill / subscription</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Due day (1-31)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving..." : "Add bill"}
        </button>
      </form>
    </div>
  );
}
