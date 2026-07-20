"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type BillInstance = {
  billId: string;
  name: string;
  amount: number;
  day: number;
  frequency: string | null;
  type: string | null;
  paid: boolean;
  isAutoDetected: boolean;
};

type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  frequency: string | null;
  nextDueDate: string | null;
  type: string | null;
  isAutoDetected: boolean;
  active: boolean;
  lastPaidDate: string | null;
  confidence: number | null;
  account: { name: string } | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function BillsView() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [instances, setInstances] = useState<BillInstance[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    const mm = `${month}`.padStart(2, "0");
    const r = await fetch(`/api/bills/calendar?month=${year}-${mm}`);
    if (r.ok) {
      const d = await r.json();
      setInstances(d.instances);
    }
  }, [year, month]);

  const loadBills = useCallback(async () => {
    const r = await fetch("/api/bills");
    if (r.ok) setBills(await r.json());
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => { loadBills(); }, [loadBills]);

  async function detect() {
    setDetecting(true);
    setDetectResult(null);
    const r = await fetch("/api/bills/detect", { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setDetectResult(`Created ${d.created}, updated ${d.updated} bills. ${d.suggestions.length} lower-confidence suggestions skipped.`);
      await Promise.all([loadCalendar(), loadBills()]);
      router.refresh();
    } else {
      setDetectResult("Detection failed.");
    }
    setDetecting(false);
  }

  async function markPaid(id: string) {
    await fetch(`/api/bills/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markPaid: true }) });
    await Promise.all([loadCalendar(), loadBills()]);
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/bills/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    await Promise.all([loadCalendar(), loadBills()]);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this bill?")) return;
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    await Promise.all([loadCalendar(), loadBills()]);
    router.refresh();
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay: Record<number, BillInstance[]> = {};
  for (const inst of instances) {
    (byDay[inst.day] ||= []).push(inst);
  }

  const monthTotal = instances.reduce((s, i) => s + i.amount, 0);
  const upcoming = instances.filter((i) => i.day >= now.getDate() && !i.paid).reduce((s, i) => s + i.amount, 0);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary text-sm" disabled={detecting} onClick={detect}>
          {detecting ? "Detecting…" : "Auto-detect recurring bills"}
        </button>
        {detectResult && <span className="text-xs text-muted">{detectResult}</span>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Bills this month</div>
          <div className="text-2xl font-semibold mt-1">{formatMoney(monthTotal)}</div>
          <div className="text-xs text-muted mt-1">{instances.length} payments</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Remaining this month</div>
          <div className="text-2xl font-semibold text-warn mt-1">{formatMoney(upcoming)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Active bills tracked</div>
          <div className="text-2xl font-semibold mt-1">{bills.length}</div>
          <div className="text-xs text-muted mt-1">{bills.filter((b) => b.isAutoDetected).length} auto-detected</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="btn-secondary text-sm" onClick={() => shiftMonth(-1)}>‹</button>
          <h2 className="text-sm font-medium">{monthLabel(year, month)}</h2>
          <button className="btn-secondary text-sm" onClick={() => shiftMonth(1)}>›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-xs text-muted text-center py-1">{w}</div>
          ))}
          {cells.map((d, i) => (
            <div key={i} className="min-h-[80px] border border-border rounded p-1 text-xs">
              {d && (
                <>
                  <div className="text-muted mb-1">{d}</div>
                  <div className="space-y-1">
                    {(byDay[d] || []).map((inst, j) => (
                      <div key={j} className={`rounded px-1 py-0.5 truncate ${inst.paid ? "bg-accent/20 text-accent line-through" : inst.type === "subscription" ? "bg-accent2/20 text-accent2" : "bg-panel2"}`} title={`${inst.name} — ${formatMoney(inst.amount)}`}>
                        {formatMoney(inst.amount)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bill list */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Bill</th>
              <th className="px-4 py-3 font-medium">Frequency</th>
              <th className="px-4 py-3 font-medium">Next due</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted">{b.type === "subscription" ? "Subscription" : "Bill"}{b.isAutoDetected ? " · auto-detected" : ""}</div>
                </td>
                <td className="px-4 py-3 text-muted capitalize">{b.frequency || "monthly"}</td>
                <td className="px-4 py-3 text-muted">
                  {b.nextDueDate ? new Date(b.nextDueDate).toLocaleDateString() : `Day ${b.dueDay}`}
                </td>
                <td className="px-4 py-3 text-right">{formatMoney(b.amount)}</td>
                <td className="px-4 py-3">
                  {b.lastPaidDate ? (
                    <span className="text-xs text-accent">paid {new Date(b.lastPaidDate).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-xs text-warn">due</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button className="text-xs text-accent2 hover:underline mr-3" onClick={() => markPaid(b.id)}>Mark paid</button>
                  <button className="text-xs text-muted hover:text-white mr-3" onClick={() => toggleActive(b.id, !b.active)}>{b.active ? "Pause" : "Resume"}</button>
                  <button className="text-xs text-danger hover:underline" onClick={() => remove(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No bills yet. Click "Auto-detect" or connect an account and sync transactions.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
