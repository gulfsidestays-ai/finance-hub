"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Asset = {
  id: string;
  name: string;
  category: string;
  isLiability: boolean;
  value: number;
  quantity: number | null;
  ticker: string | null;
  notes: string | null;
};

const ASSET_CATEGORIES = [
  { v: "property", label: "Real Estate", liability: false },
  { v: "vehicle", label: "Vehicle", liability: false },
  { v: "crypto", label: "Crypto", liability: false },
  { v: "cash", label: "Cash (manual)", liability: false },
  { v: "other_asset", label: "Other Asset", liability: false },
  { v: "mortgage", label: "Mortgage", liability: true },
  { v: "loan", label: "Personal Loan", liability: true },
  { v: "other_liability", label: "Other Liability", liability: true },
];

export default function AssetsView({ nw }: { nw: { totalAssets: number; totalLiabilities: number; netWorth: number } }) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cat, setCat] = useState("property");

  const load = useCallback(async () => {
    const r = await fetch("/api/assets");
    if (r.ok) setAssets(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const meta = ASSET_CATEGORIES.find((c) => c.v === f.get("category"));
    const body: any = {
      name: f.get("name"),
      category: f.get("category"),
      isLiability: meta?.liability ?? false,
      value: Number(f.get("value")),
      quantity: f.get("quantity") ? Number(f.get("quantity")) : null,
      ticker: f.get("ticker") || null,
      notes: f.get("notes") || null,
    };
    await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    setCat("property");
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  const assetList = assets.filter((a) => !a.isLiability);
  const liabList = assets.filter((a) => a.isLiability);
  const manualAssetsTotal = assetList.reduce((s, a) => s + a.value, 0);
  const manualLiabTotal = liabList.reduce((s, a) => s + a.value, 0);

  const Row = ({ a }: { a: Asset }) => {
    const meta = ASSET_CATEGORIES.find((c) => c.v === a.category);
    return (
      <div className="flex justify-between items-center py-3 border-b border-border last:border-0">
        <div>
          <div className="text-sm font-medium">{a.name}</div>
          <div className="text-xs text-muted">
            {meta?.label || a.category}{a.ticker ? ` · ${a.ticker}` : ""}{a.quantity ? ` · ${a.quantity} units` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={a.isLiability ? "text-danger" : "text-white"}>{formatMoney(a.value)}</span>
          <button className="text-xs text-danger hover:underline" onClick={() => remove(a.id)}>Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-muted">Total assets</div>
          <div className="text-2xl font-semibold text-accent">{formatMoney(nw.totalAssets)}</div>
          <div className="text-xs text-muted mt-1">Manual: {formatMoney(manualAssetsTotal)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Total liabilities</div>
          <div className="text-2xl font-semibold text-danger">{formatMoney(nw.totalLiabilities)}</div>
          <div className="text-xs text-muted mt-1">Manual: {formatMoney(manualLiabTotal)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Net worth</div>
          <div className="text-2xl font-semibold">{formatMoney(nw.netWorth)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">Manually track property, vehicles, crypto, and other balances.</p>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>+ Add item</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input sm:col-span-2" name="name" placeholder="Item name (e.g. 2019 Honda Civic)" required />
          <select className="input" name="category" value={cat} onChange={(e) => setCat(e.target.value)}>
            {ASSET_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}{c.liability ? " (liability)" : ""}</option>)}
          </select>
          <input className="input" name="value" type="number" step="0.01" placeholder={ASSET_CATEGORIES.find((c) => c.v === cat)?.liability ? "Amount owed" : "Estimated value"} required />
          <input className="input" name="quantity" type="number" step="0.0001" placeholder="Units (crypto)" />
          <input className="input" name="ticker" placeholder="Symbol (e.g. BTC)" />
          <input className="input sm:col-span-3" name="notes" placeholder="Notes (optional)" />
          <button className="btn-primary sm:col-span-3">Add item</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-2">Assets</h2>
          {assetList.length ? assetList.map((a) => <Row key={a.id} a={a} />) : <p className="text-muted text-sm py-3">No manual assets.</p>}
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-2">Liabilities</h2>
          {liabList.length ? liabList.map((a) => <Row key={a.id} a={a} />) : <p className="text-muted text-sm py-3">No manual liabilities.</p>}
        </div>
      </div>
    </div>
  );
}
