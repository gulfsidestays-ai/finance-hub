"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type CategoryRef = { name: string; emoji: string | null };
type Tag = { id: string; name: string; color: string };
type Txn = {
  id: string;
  name: string;
  merchantName: string | null;
  amount: number;
  date: string;
  category: string | null;
  categoryId: string | null;
  reviewed: boolean;
  notes: string | null;
  account: { name: string };
  categoryRef: CategoryRef | null;
  tags: { tag: Tag }[];
  splits: { id: string; amount: number; category: CategoryRef | null; notes: string | null }[];
};

type Group = {
  id: string;
  name: string;
  type: string;
  categories: { id: string; name: string; emoji: string | null; isSystem: boolean }[];
};

export default function TransactionsList() {
  const router = useRouter();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reviewed, setReviewed] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (reviewed) params.set("reviewed", reviewed);
    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) setTxns(await res.json());
    setLoading(false);
  }, [search, categoryId, reviewed]);

  useEffect(() => {
    const g = new URLSearchParams();
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, reviewed]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setGroups).catch(() => {});
  }, []);

  async function patch(id: string, data: any) {
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
    router.refresh();
  }

  const totalIn = txns.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const totalOut = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search name, merchant, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {groups.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {g.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select className="input" value={reviewed} onChange={(e) => setReviewed(e.target.value)}>
          <option value="">All</option>
          <option value="false">Unreviewed</option>
          <option value="true">Reviewed</option>
        </select>
        <div className="text-xs text-muted ml-auto">
          {txns.length} txn · <span className="text-accent">in {formatMoney(totalIn)}</span> ·{" "}
          <span className="text-danger">out {formatMoney(totalOut)}</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-3 py-3 font-medium w-8">✓</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <Fragment key={t.id}>
                <tr
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-panel2 ${t.reviewed ? "opacity-60" : ""}`}
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={t.reviewed}
                      onChange={(e) => patch(t.id, { reviewed: e.target.checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div>{t.name}</div>
                    <div className="text-xs text-muted">{t.account.name}</div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="input py-1 text-xs"
                      value={t.categoryId ?? ""}
                      onChange={(e) => patch(t.id, { categoryId: e.target.value || null })}
                    >
                      <option value="">Uncategorized</option>
                      {groups.map((g) => (
                        <optgroup key={g.id} label={g.name}>
                          {g.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.emoji} {c.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map(({ tag }) => (
                        <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: tag.color + "22", color: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                      {t.splits.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent2/20 text-accent2">split ×{t.splits.length}</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right ${t.amount > 0 ? "" : "text-accent"}`}>
                    {formatMoney(-t.amount)}
                  </td>
                </tr>
                {expanded === t.id && (
                  <tr className="border-b border-border bg-panel2/40">
                    <td colSpan={6} className="px-4 py-4">
                      <ExpandedRow txn={t} groups={groups} onSaved={() => load()} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {txns.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No transactions found. Connect a bank account or add one manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandedRow({ txn, groups, onSaved }: { txn: Txn; groups: Group[]; onSaved: () => void }) {
  const [notes, setNotes] = useState(txn.notes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [splitAmount, setSplitAmount] = useState("");
  const [splitCat, setSplitCat] = useState("");

  async function saveNotes() {
    await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    onSaved();
  }
  async function addTag() {
    if (!tagInput.trim()) return;
    const current = txn.tags.map(({ tag }) => tag.name);
    await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: [...current, tagInput.trim()] }),
    });
    setTagInput("");
    onSaved();
  }
  async function removeTag(name: string) {
    const remaining = txn.tags.map(({ tag }) => tag.name).filter((n) => n !== name);
    await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: remaining }),
    });
    onSaved();
  }
  async function addSplit() {
    await fetch(`/api/transactions/${txn.id}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(splitAmount), categoryId: splitCat || null }),
    });
    setSplitAmount("");
    onSaved();
  }
  async function removeSplit(id: string) {
    await fetch(`/api/transactions/${txn.id}/split?splitId=${id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Notes</label>
        <div className="flex gap-2">
          <input className="input flex-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" />
          <button className="btn-secondary" onClick={saveNotes}>Save note</button>
        </div>
      </div>

      <div>
        <label className="label">Tags</label>
        <div className="flex flex-wrap gap-2 items-center">
          {txn.tags.map(({ tag }) => (
            <button key={tag.id} onClick={() => removeTag(tag.name)} className="text-xs px-2 py-1 rounded-full hover:opacity-70" style={{ background: tag.color + "22", color: tag.color }}>
              {tag.name} ✕
            </button>
          ))}
          <input className="input py-1 text-xs w-32" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="add tag…" />
          <button className="btn-secondary text-xs" onClick={addTag}>Add</button>
        </div>
      </div>

      <div>
        <label className="label">Split transaction</label>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="input py-1 text-xs w-24" type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="amount" />
          <select className="input py-1 text-xs" value={splitCat} onChange={(e) => setSplitCat(e.target.value)}>
            <option value="">Category…</option>
            {groups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button className="btn-secondary text-xs" onClick={addSplit}>Add split</button>
        </div>
        {txn.splits.length > 0 && (
          <div className="mt-2 space-y-1">
            {txn.splits.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span>{s.category?.emoji} {s.category?.name ?? "Uncategorized"}</span>
                <span className="text-muted">{formatMoney(s.amount)}</span>
                <button className="text-danger" onClick={() => removeSplit(s.id)}>remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
