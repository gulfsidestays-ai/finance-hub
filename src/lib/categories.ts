import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Legacy spend-category normalization (still used by the credit-card
// recommendation engine and the original budget math). Kept intact so nothing
// breaks while the richer Category model is introduced alongside it.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Default category groups + categories (Monarch-style starter set).
// Seeded into the DB on first use and idempotent on re-runs.
// ---------------------------------------------------------------------------

type SeedCat = { name: string; emoji: string };
type SeedGroup = {
  name: string;
  type: "income" | "expense" | "transfer";
  emoji?: string;
  categories: SeedCat[];
};

export const DEFAULT_GROUPS: SeedGroup[] = [
  {
    name: "Income",
    type: "income",
    categories: [
      { name: "Salary", emoji: "💼" },
      { name: "Freelance", emoji: "🧾" },
      { name: "Investments", emoji: "📈" },
      { name: "Refunds", emoji: "↩️" },
      { name: "Other Income", emoji: "➕" },
    ],
  },
  {
    name: "Housing",
    type: "expense",
    categories: [
      { name: "Rent", emoji: "🏠" },
      { name: "Mortgage", emoji: "🏦" },
      { name: "Utilities", emoji: "💡" },
      { name: "Home Insurance", emoji: "🛡️" },
      { name: "Property Tax", emoji: "🏛️" },
      { name: "Maintenance", emoji: "🔧" },
    ],
  },
  {
    name: "Transportation",
    type: "expense",
    categories: [
      { name: "Gas", emoji: "⛽" },
      { name: "Auto Insurance", emoji: "🚗" },
      { name: "Auto Loan", emoji: "🔑" },
      { name: "Parking", emoji: "🅿️" },
      { name: "Public Transit", emoji: "🚆" },
      { name: "Rideshare", emoji: "🚕" },
    ],
  },
  {
    name: "Food & Dining",
    type: "expense",
    categories: [
      { name: "Groceries", emoji: "🛒" },
      { name: "Restaurants", emoji: "🍽️" },
      { name: "Coffee", emoji: "☕" },
      { name: "Delivery", emoji: "🥡" },
    ],
  },
  {
    name: "Shopping",
    type: "expense",
    categories: [
      { name: "Clothing", emoji: "👕" },
      { name: "Electronics", emoji: "📱" },
      { name: "Household", emoji: "🧺" },
      { name: "Health & Beauty", emoji: "💄" },
    ],
  },
  {
    name: "Entertainment",
    type: "expense",
    categories: [
      { name: "Streaming", emoji: "📺" },
      { name: "Movies", emoji: "🎬" },
      { name: "Music", emoji: "🎵" },
      { name: "Games", emoji: "🎮" },
      { name: "Hobbies", emoji: "🎨" },
    ],
  },
  {
    name: "Health & Fitness",
    type: "expense",
    categories: [
      { name: "Gym", emoji: "🏋️" },
      { name: "Doctor", emoji: "🩺" },
      { name: "Pharmacy", emoji: "💊" },
      { name: "Insurance", emoji: "🏥" },
    ],
  },
  {
    name: "Personal",
    type: "expense",
    categories: [
      { name: "Education", emoji: "📚" },
      { name: "Childcare", emoji: "👶" },
      { name: "Gifts", emoji: "🎁" },
      { name: "Donations", emoji: "❤️" },
      { name: "Travel", emoji: "✈️" },
      { name: "Fees", emoji: "💸" },
    ],
  },
  {
    name: "Transfers",
    type: "transfer",
    categories: [
      { name: "Transfer", emoji: "🔁" },
      { name: "Credit Card Payment", emoji: "💳" },
      { name: "Investment Transfer", emoji: "📊" },
    ],
  },
  {
    name: "Other",
    type: "expense",
    categories: [{ name: "Uncategorized", emoji: "❓" }],
  },
];

/**
 * Ensures the default category groups + categories exist. Idempotent —
 * safe to call on every categories API request. Returns the full tree.
 */
export async function ensureDefaultCategories() {
  const existingGroups = await prisma.categoryGroup.count();
  if (existingGroups > 0) return;

  let order = 0;
  for (const g of DEFAULT_GROUPS) {
    const group = await prisma.categoryGroup.create({
      data: {
        name: g.name,
        type: g.type,
        sortOrder: order,
        isSystem: true,
      },
    });
    let catOrder = 0;
    for (const c of g.categories) {
      await prisma.category.create({
        data: {
          groupId: group.id,
          name: c.name,
          emoji: c.emoji,
          type: g.type,
          sortOrder: catOrder,
          isSystem: true,
        },
      });
      catOrder++;
    }
    order++;
  }
}

export async function getCategoryTree() {
  await ensureDefaultCategories();
  const groups = await prisma.categoryGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  return groups;
}
