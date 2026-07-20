"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMoney } from "@/lib/format";

const SCOPES = [
  { v: "dashboard", label: "Overview" },
  { v: "networth", label: "Net Worth" },
  { v: "cashflow", label: "Cash Flow" },
  { v: "goals", label: "Goals" },
  { v: "investments", label: "Investments" },
  { v: "bills", label: "Bills" },
];

type Share = {
  id: string; name: string; role: string; tokenPreview: string | null;
  scopes: string; expiresAt: string | null; revokedAt: string | null;
  lastAccessedAt: string | null; createdAt: string;
};

export default function SharesView() {
  const [shares, setShares] = useState<Share[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);
  const [selected, setSelected] = useState<string[]>(["dashboard", "networth", "cashflow"]);

  const load = useCallback(async () => {
    const r = await fetch("/api/shares");
    if (r.ok) setShares(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: any = {
      name: f.get("name"),
      role: f.get("role"),
      scopes: selected,
      expiresAt: f.get("expiresAt") || null,
    };
    const r = await fetch("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      const data = await r.json();
      setCreated({ token: data.token, name: data.name });
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      await load();
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this share link? It will stop working immediately.")) return;
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    await load();
  }

  function toggleScope(v: string) {
    setSelected((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v]);
  }

  const base = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">Generate read-only share links for a partner or advisor. Links show aggregates only.</p>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>+ New share link</button>
      </div>

      {created && (
        <div className="card p-5 border border-accent">
          <h3 className="text-sm font-medium mb-1">Share link created for {created.name}</h3>
          <p className="text-xs text-muted mb-2">Copy this link now — it won&apos;t be shown again.</p>
          <div className="flex gap-2">
            <input className="input flex-1 text-xs" readOnly value={`${base}/share/${created.token}`} onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button className="btn-secondary text-xs" onClick={() => { navigator.clipboard?.writeText(`${base}/share/${created.token}`); }}>Copy</button>
          </div>
          <button className="text-xs text-accent2 hover:underline mt-2" onClick={() => setCreated(null)}>Done</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="input sm:col-span-2" name="name" placeholder="Name (e.g. Advisor Smith)" required />
            <select className="input" name="role" defaultValue="advisor">
              <option value="viewer">Viewer</option><option value="advisor">Advisor</option><option value="partner">Partner</option>
            </select>
          </div>
          <div>
            <div className="label mb-2">Scopes</div>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <button type="button" key={s.v} onClick={() => toggleScope(s.v)}
                  className={`text-xs px-3 py-1 rounded-full border ${selected.includes(s.v) ? "bg-accent text-black border-accent" : "border-border text-muted"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <input className="input" name="expiresAt" type="date" />
          <button className="btn-primary">Create link</button>
        </form>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-medium mb-3">Active shares</h2>
        {shares.length ? (
          <div className="space-y-3">
            {shares.map((s) => {
              const revoked = !!s.revokedAt;
              const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
              const active = !revoked && !expired;
              let scopes: string[] = [];
              try { scopes = JSON.parse(s.scopes); } catch {}
              return (
                <div key={s.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium">{s.name} <span className="text-xs text-muted">· {s.role}</span></div>
                    <div className="text-xs text-muted">
                      {scopes.map((sc) => SCOPES.find((x) => x.v === sc)?.label || sc).join(", ")}
                      {s.expiresAt && ` · expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                      {s.lastAccessedAt && ` · last viewed ${new Date(s.lastAccessedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-accent/20 text-accent" : "bg-panel2 text-muted"}`}>
                      {revoked ? "Revoked" : expired ? "Expired" : "Active"}
                    </span>
                    {active && <button className="text-xs text-danger hover:underline" onClick={() => revoke(s.id)}>Revoke</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-muted text-sm">No share links yet.</p>}
      </div>
    </div>
  );
}
