// Normalizes the many raw category strings Plaid (or manual entry) can
// produce down to the small set the credit-card recommendation engine
// and budgeting UI use.

export type SpendCategory =
  | "dining"
  | "groceries"
  | "travel"
  | "gas"
  | "entertainment"
  | "drugstores"
  | "streaming"
  | "other";

const RULES: Array<{ match: RegExp; category: SpendCategory }> = [
  { match: /food.?and.?drink|restaurant|dining|coffee/i, category: "dining" },
  { match: /grocer|supermarket/i, category: "groceries" },
  { match: /travel|airline|hotel|lodging|rideshare/i, category: "travel" },
  { match: /gas.?station|fuel/i, category: "gas" },
  { match: /entertainment|recreation|movie/i, category: "entertainment" },
  { match: /pharmac|drugstore/i, category: "drugstores" },
  { match: /streaming|subscription|media/i, category: "streaming" },
];

export function normalizeCategory(raw: string | null | undefined): SpendCategory {
  if (!raw) return "other";
  for (const rule of RULES) {
    if (rule.match.test(raw)) return rule.category;
  }
  return "other";
}

export const SPEND_CATEGORIES: SpendCategory[] = [
  "dining",
  "groceries",
  "travel",
  "gas",
  "entertainment",
  "drugstores",
  "streaming",
  "other",
];
