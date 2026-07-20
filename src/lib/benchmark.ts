// S&P 500 price-return benchmark (Phase 5).
// Fetches daily closes from Stooq (no API key, server-side). Caches 24h.
// This is a PRICE-return benchmark (dividends excluded).

const SYMBOLS = ["^spx", "spy.us"];
const CACHE_MS = 24 * 60 * 60 * 1000;

type Cache = { asOf: number; rows: { date: string; close: number }[] };
let cache: Cache | null = null;

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchRows(): Promise<{ date: string; close: number }[]> {
  // Earliest fetch: 8 years back to cover long-dated holdings.
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 8);
  for (const sym of SYMBOLS) {
    const url = `https://stooq.com/q/d/l/?s=${sym}&d1=${fmt(from)}&d2=${fmt(to)}&i=d`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) continue;
      const header = lines[0].toLowerCase().split(",");
      const di = header.indexOf("date");
      const ci = header.indexOf("close");
      if (di < 0 || ci < 0) continue;
      const rows: { date: string; close: number }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const close = parseFloat(cols[ci]);
        if (cols[di] && !isNaN(close)) rows.push({ date: cols[di], close });
      }
      if (rows.length) {
        rows.sort((a, b) => (a.date < b.date ? -1 : 1));
        return rows;
      }
    } catch {
      // try next symbol
    }
  }
  return [];
}

async function getRows() {
  if (cache && Date.now() - cache.asOf < CACHE_MS) return cache.rows;
  const rows = await fetchRows();
  if (rows.length) cache = { asOf: Date.now(), rows };
  return rows;
}

// First trading close on or after the given date.
export async function closeOnOrAfter(date: Date): Promise<number | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const target = fmt(date);
  for (const r of rows) {
    if (r.date >= target) return r.close;
  }
  return rows[rows.length - 1].close;
}

export async function latestClose(): Promise<{ close: number; date: string } | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  return { close: last.close, date: last.date };
}

// Trailing price-return % for a period (months back from latest close).
export async function trailingReturn(months: number): Promise<number | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const latest = rows[rows.length - 1].close;
  const target = new Date();
  target.setMonth(target.getMonth() - months);
  const targetStr = fmt(target);
  let base: number | null = null;
  for (const r of rows) {
    if (r.date >= targetStr) { base = r.close; break; }
  }
  if (base == null || base === 0) return null;
  return (latest - base) / base;
}

export async function sp500Status() {
  const rows = await getRows();
  return { available: rows.length > 0, count: rows.length };
}
