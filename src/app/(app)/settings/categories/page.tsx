"use client";

import { useEffect, useState } from "react";

type Cat = { id: string; name: string; emoji: string | null; rollover: boolean; excludeFromBudget: boolean; isSystem: boolean };
type Group = { id: string; name: string; type: string; isSystem: boolean; categories: Cat[] };

export default function CategoriesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/categories");
    if (r.ok) setGroups(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function createCategory() {
    if (!newGroup || !newName) return;
    setCreating(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: newGroup, name: newName, emoji: newEmoji || null }),
    });
    setNewName(""); setNewEmoji("");
    setCreating(false);
    await load();
  }

  async function createGroup() {
    const name = prompt("New group name (e.g. Pets)");
    if (!name) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createGroup: true, name, type: "expense" }),
    });
    await load();
  }

  async function toggle(cat: Cat, field: "rollover" | "excludeFromBudget") {
    await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !cat[field] }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this custom category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-muted text-sm mt-1">Organize spending into groups. Toggle rollover or exclude-from-budget per category.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-medium">Add category</div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
            <option value="">Select group…</option>
            {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
          <input className="input w-20" placeholder="🐛" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} />
          <input className="input flex-1 min-w-[160px]" placeholder="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" disabled={creating} onClick={createCategory}>Add</button>
          <button className="btn-secondary" onClick={createGroup}>+ New group</button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-panel2/40">
              <span className="font-medium text-sm">{g.name}</span>
              <span className="ml-2 text-xs text-muted uppercase">{g.type}</span>
            </div>
            <div className="divide-y divide-border">
              {g.categories.map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className="w-6 text-center">{c.emoji}</span>
                  <span className="flex-1">{c.name}</span>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={c.rollover} onChange={() => toggle(c, "rollover")} /> rollover
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={c.excludeFromBudget} onChange={() => toggle(c, "excludeFromBudget")} /> exclude
                  </label>
                  {!c.isSystem && (
                    <button className="text-danger text-xs" onClick={() => remove(c.id)}>delete</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
