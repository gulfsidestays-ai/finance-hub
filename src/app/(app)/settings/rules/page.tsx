"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: string;
  name: string | null;
  matchField: string;
  matchType: string;
  matchValue: string;
  setReviewed: boolean;
  addTags: string | null;
  active: boolean;
  category: { name: string; emoji: string | null } | null;
  categoryId: string | null;
};

type Group = { id: string; name: string; categories: { id: string; name: string; emoji: string | null }[] };

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [matchValue, setMatchValue] = useState("");
  const [matchField, setMatchField] = useState("name");
  const [matchType, setMatchType] = useState("contains");
  const [categoryId, setCategoryId] = useState("");
  const [setReviewed, setSetReviewed] = useState(false);
  const [addTags, setAddTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [rr, gr] = await Promise.all([fetch("/api/rules"), fetch("/api/categories")]);
    if (rr.ok) setRules(await rr.json());
    if (gr.ok) setGroups(await gr.json());
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!matchValue) return;
    setSaving(true);
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchValue, matchField, matchType,
        categoryId: categoryId || null,
        setReviewed,
        addTags: addTags || null,
        name: matchValue,
      }),
    });
    setMatchValue(""); setAddTags(""); setCategoryId("");
    setSaving(false);
    await load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    await load();
  }

  async function runAll() {
    if (!confirm("Run all active rules against every transaction? This may re-categorize unreviewed transactions.")) return;
    const r = await fetch("/api/rules/run", { method: "POST" });
    if (r.ok) {
      const res = await r.json();
      alert(`Updated ${res.changed} of ${res.total} transactions.`);
    } else {
      alert("Failed to run rules.");
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transaction Rules</h1>
          <p className="text-muted text-sm mt-1">Automatically categorize, tag, and review transactions as they sync in.</p>
        </div>
        <button className="btn-secondary text-sm" onClick={runAll}>Run all rules now</button>
      </div>

      {/* Create rule */}
      <div className="card p-4 space-y-3">
        <div className="text-sm font-medium">New rule</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select className="input" value={matchField} onChange={(e) => setMatchField(e.target.value)}>
            <option value="name">Name</option>
            <option value="merchantName">Merchant</option>
            <option value="category">Category</option>
          </select>
          <select className="input" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
            <option value="contains">contains</option>
            <option value="equals">equals</option>
            <option value="startsWith">starts with</option>
            <option value="regex">regex</option>
          </select>
          <input className="input sm:col-span-2" placeholder="e.g. starbucks" value={matchValue} onChange={(e) => setMatchValue(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Categorize as…</option>
            {groups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.categories.map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}
              </optgroup>
            ))}
          </select>
          <input className="input" placeholder="tags: coffee,recurring" value={addTags} onChange={(e) => setAddTags(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={setReviewed} onChange={(e) => setSetReviewed(e.target.checked)} /> mark reviewed
          </label>
        </div>
        <button className="btn-primary" disabled={saving || !matchValue} onClick={create}>Create rule</button>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">If {`{field}`} {`{type}`}</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Then</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted">{r.matchField} {r.matchType}</td>
                <td className="px-4 py-3 font-medium">{r.matchValue}</td>
                <td className="px-4 py-3">
                  {r.category ? <span>{r.category.emoji} {r.category.name}</span> : <span className="text-muted">—</span>}
                  {r.setReviewed && <span className="ml-2 text-xs text-accent2">review</span>}
                  {r.addTags && <span className="ml-2 text-xs text-muted">#{r.addTags}</span>}
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={r.active} onChange={(e) => toggle(r.id, e.target.checked)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-danger text-xs" onClick={() => remove(r.id)}>delete</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No rules yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
