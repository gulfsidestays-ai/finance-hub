"use client";

import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Account = {
  id: string;
  name: string;
  type: string;
  institutionName: string | null;
  currentBalance: number;
  creditLimit: number | null;
  isManual: boolean;
  mask: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  loan: "Loan",
  investment: "Investment",
  other: "Other",
};

export default function AccountsList({ accounts }: { accounts: Account[] }) {
  const router = useRouter();

  async function remove(id: string) {
    if (!confirm("Remove this account? Its transactions will be deleted too.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (accounts.length === 0) {
    return <p className="text-muted text-sm">No accounts yet — connect a bank or add one manually.</p>;
  }

  return (
    <div className="space-y-2">
      {accounts.map((a) => (
        <div key={a.id} className="card flex items-center justify-between">
          <div>
            <div className="font-medium">
              {a.name} {a.mask && <span className="text-muted text-xs">•••{a.mask}</span>}
            </div>
            <div className="text-xs text-muted">
              {TYPE_LABEL[a.type] ?? a.type}
              {a.institutionName ? ` · ${a.institutionName}` : ""}
              {a.isManual ? " · manual" : " · synced via Plaid"}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold">{formatMoney(a.currentBalance)}</div>
              {a.creditLimit != null && (
                <div className="text-xs text-muted">of {formatMoney(a.creditLimit)} limit</div>
              )}
            </div>
            <button onClick={() => remove(a.id)} className="text-muted hover:text-danger text-sm">
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
