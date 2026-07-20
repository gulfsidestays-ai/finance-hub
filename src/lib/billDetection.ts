import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Recurring-bill detection + calendar projection (Phase 2).
//
// Detection groups spending transactions by a normalized merchant name, checks
// interval consistency (median gap → frequency) and amount consistency, then
// scores confidence. Bills above the threshold are upserted (auto-detected);
// the rest are returned as lower-confidence suggestions.
// ---------------------------------------------------------------------------

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

const FREQ_RANGES: Record<Frequency, [number, number]> = {
  weekly: [6, 8],
  biweekly: [12, 16],
  monthly: [25, 35],
  quarterly: [80, 100],
  annual: [330, 400],
};

// Categories that look like noise for recurrence detection.
const NOISE_CATEGORY = /transfer|atm|credit card payment|internal|refund|deposit withdrawal|withdrawal/i;
const NOISE_NAME = /atm withdrawal|transfer|credit card payment|internal transfer|deposit/i;

export function normalizeName(raw: string): string {
  let n = (raw || "").toLowerCase().trim();
  // strip card masks like *1234 and trailing dates/reference numbers
  n = n.replace(/\*+\d{2,4}/g, "");
  n = n.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");
  n = n.replace(/\b(ref|reference|txn|pos|purchased|debit|card)[:#]?\d*/g, "");
  // collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  // strip trailing pure numbers
  n = n.replace(/\s+\d+\s*$/g, "").trim();
  return n;
}

function classifyFrequency(medianInterval: number): Frequency | null {
  for (const f of Object.keys(FREQ_RANGES) as Frequency[]) {
    const [lo, hi] = FREQ_RANGES[f];
    if (medianInterval >= lo && medianInterval <= hi) return f;
  }
  return null;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type DetectedBill = {
  name: string;
  normalizedKey: string;
  amount: number; // median amount
  lastAmount: number;
  avgAmount: number;
  frequency: Frequency;
  nextDueDate: Date;
  confidence: number;
  occurrences: number;
  category: string | null;
  accountId: string | null;
  type: "bill" | "subscription";
  sourceNames: string[];
};

export type DetectionResult = {
  created: number;
  updated: number;
  suggestions: DetectedBill[]; // below threshold
  detected: DetectedBill[];
};

export async function detectRecurringBills(): Promise<DetectionResult> {
  // Spending transactions only (amount > 0 = money out). Look back ~2 years.
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);

  const txns = await prisma.transaction.findMany({
    where: { amount: { gt: 0 }, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { id: true, name: true, merchantName: true, amount: true, date: true, category: true, accountId: true },
  });

  // Group by normalized name + accountId (same merchant on different accounts
  // are kept separate so we don't merge e.g. two utility providers).
  const groups = new Map<string, typeof txns>();
  for (const t of txns) {
    if (NOISE_CATEGORY.test(t.category || "")) continue;
    if (NOISE_NAME.test(t.name)) continue;
    const key = `${normalizeName(t.merchantName || t.name)}::${t.accountId ?? "none"}`;
    const arr = groups.get(key) || [];
    arr.push(t);
    groups.set(key, arr);
  }

  const detected: DetectedBill[] = [];

  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Intervals between consecutive occurrences (days)
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86400000);
    }
    const medInterval = median(intervals);
    const frequency = classifyFrequency(medInterval);
    if (!frequency) continue;

    // Frequency-specific minimum occurrences
    const minOcc = frequency === "quarterly" || frequency === "annual" ? 2 : 3;
    if (sorted.length < minOcc) continue;

    // Amount consistency: each occurrence within max($2, 10% of median)
    const amounts = sorted.map((t) => t.amount);
    const medAmount = median(amounts);
    const tolerance = Math.max(2, Math.abs(medAmount) * 0.1);
    const within = amounts.filter((a) => Math.abs(a - medAmount) <= tolerance).length;
    const amountRatio = within / amounts.length;

    // ---- Confidence scoring ----
    let confidence = 0;
    confidence += 0.35; // interval matched a known frequency
    confidence += 0.25 * amountRatio; // amount consistency
    confidence += sorted.length >= 3 ? 0.2 : 0.1; // occurrence count
    confidence += 0.1; // stable merchant name
    const cat = sorted[0].category || "";
    if (/streaming|subscription|software|membership|phone|utility|insurance|internet|rent|mortgage|gym/i.test(cat)) {
      confidence += 0.1;
    }
    confidence = Math.min(1, confidence);

    const last = sorted[sorted.length - 1];
    // Roll forward to the next future occurrence so "next due" is upcoming, not stale.
    const nextDueDate = computeNextDueDate(last.date, frequency, new Date());

    const isSubscription = /streaming|subscription|software|membership|netflix|spotify|hulu|disney|apple|google|adobe|amazon prime/i.test(cat + " " + last.name);

    detected.push({
      name: last.merchantName || last.name,
      normalizedKey: key,
      amount: Math.round(medAmount * 100) / 100,
      lastAmount: last.amount,
      avgAmount: Math.round((amounts.reduce((s, a) => s + a, 0) / amounts.length) * 100) / 100,
      frequency,
      nextDueDate,
      confidence: Math.round(confidence * 100) / 100,
      occurrences: sorted.length,
      category: cat || null,
      accountId: last.accountId,
      type: isSubscription ? "subscription" : "bill",
      sourceNames: sorted.map((t) => t.name),
    });
  }

  // Sort by confidence desc
  detected.sort((a, b) => b.confidence - a.confidence);

  // Upsert high-confidence bills (>= 0.65); avoid overwriting manual bills.
  const THRESHOLD = 0.65;
  const toCreate = detected.filter((d) => d.confidence >= THRESHOLD);
  const suggestions = detected.filter((d) => d.confidence < THRESHOLD);

  // Existing auto-detected bills by normalized key, so we update instead of dup.
  const existingAuto = await prisma.bill.findMany({
    where: { isAutoDetected: true },
    select: { id: true, name: true, accountId: true, amount: true, confidence: true },
  });
  const existingManualNames = new Set(
    (await prisma.bill.findMany({ where: { isAutoDetected: false }, select: { name: true } })).map((b) => normalizeName(b.name))
  );

  const keyById = (d: DetectedBill) => existingAuto.find((b) => `${normalizeName(b.name)}::${b.accountId ?? "none"}` === d.normalizedKey);

  let created = 0;
  let updated = 0;
  for (const d of toCreate) {
    // Don't auto-create if a manual bill already covers this merchant.
    if (existingManualNames.has(normalizeName(d.name))) continue;

    const existing = keyById(d);
    const data = {
      name: d.name,
      amount: d.amount,
      dueDay: d.nextDueDate.getDate(),
      category: d.category,
      isAutoDetected: true,
      frequency: d.frequency,
      nextDueDate: d.nextDueDate,
      lastAmount: d.lastAmount,
      avgAmount: d.avgAmount,
      type: d.type,
      confidence: d.confidence,
      sourceNames: JSON.stringify(d.sourceNames),
      autoDetectedAt: new Date(),
      accountId: d.accountId,
    };
    if (existing) {
      await prisma.bill.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.bill.create({ data });
      created++;
    }
  }

  return { created, updated, suggestions, detected };
}

// ---------------------------------------------------------------------------
// Date math that clamps day-of-month correctly for monthly/quarterly/annual.
// ---------------------------------------------------------------------------

export function advanceDate(from: Date, frequency: Frequency, count: number): Date {
  const d = new Date(from);
  if (frequency === "weekly") d.setDate(d.getDate() + 7 * count);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14 * count);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + count);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3 * count);
  else if (frequency === "annual") d.setFullYear(d.getFullYear() + count);
  return d;
}

/** Advance a bill's next due date past `today` using its frequency.
 *  Used by the mark-paid flow. Falls back to same-day-next-month for manual bills. */
export function computeNextDueDate(current: Date | null, frequency: string | null, today: Date): Date {
  const base = current ?? today;
  const freq = (frequency as Frequency | null) ?? null;
  if (!freq) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  let next = new Date(base);
  while (next <= today) {
    next = advanceDate(next, freq, 1);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Calendar projection: return projected bill instances for a target month.
// ---------------------------------------------------------------------------

export type BillInstance = {
  billId: string;
  name: string;
  amount: number;
  day: number; // day of month in the target month
  frequency: Frequency | null;
  type: string | null;
  paid: boolean;
  accountId: string | null;
  isAutoDetected: boolean;
};

export async function projectCalendar(year: number, month: number): Promise<BillInstance[]> {
  // month is 1-based
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // exclusive

  const bills = await prisma.bill.findMany({
    where: { active: true },
    include: { account: { select: { name: true } } },
  });

  const instances: BillInstance[] = [];

  for (const b of bills) {
    // Determine the first occurrence to start projecting from.
    let cursor: Date;
    const freq = (b.frequency as Frequency | null) ?? null;

    if (b.nextDueDate) {
      cursor = new Date(b.nextDueDate);
      // roll cursor back to the most recent occurrence on or before monthStart,
      // then project forward so we capture every occurrence in the target month.
      if (freq) {
        while (advanceDate(cursor, freq, -1) >= monthStart) {
          cursor = advanceDate(cursor, freq, -1);
        }
      }
    } else {
      // Manual monthly bill using dueDay.
      const day = Math.min(b.dueDay, new Date(year, month, 0).getDate());
      cursor = new Date(year, month - 1, day);
      if (cursor < monthStart) continue;
    }

    // Project forward across the target month.
    let guard = 0;
    while (cursor < monthEnd && guard < 400) {
      if (cursor >= monthStart && cursor < monthEnd) {
        instances.push({
          billId: b.id,
          name: b.name,
          amount: b.lastAmount ?? b.amount,
          day: cursor.getDate(),
          frequency: freq,
          type: b.type,
          paid: b.lastPaidDate ? b.lastPaidDate >= new Date(cursor.getTime() - 86400000 * 3) : false,
          accountId: b.accountId,
          isAutoDetected: b.isAutoDetected,
        });
      }
      if (!freq) break; // manual dueDay bill → single occurrence
      cursor = advanceDate(cursor, freq, 1);
      guard++;
    }
  }

  return instances.sort((a, b) => a.day - b.day);
}
