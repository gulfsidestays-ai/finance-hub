import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Transaction rules engine.
//
// A rule matches a transaction's name / merchantName / category against a
// value using contains | equals | startsWith | regex, and (optionally) sets
// a category, marks it reviewed, and adds tags.
//
// applyRulesToTransaction is called when transactions are created (manual
// entry + Plaid sync) so categorization is automatic.
// ---------------------------------------------------------------------------

export type RuleMatchField = "name" | "merchantName" | "category";
export type RuleMatchType = "contains" | "equals" | "startsWith" | "regex";

function getField(txn: { name: string; merchantName?: string | null; category?: string | null }, field: string): string {
  if (field === "merchantName") return txn.merchantName ?? txn.name ?? "";
  if (field === "category") return txn.category ?? "";
  return txn.name ?? "";
}

function matches(haystack: string, type: string, needle: string): boolean {
  if (!needle) return false;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  switch (type) {
    case "equals":
      return h === n;
    case "startsWith":
      return h.startsWith(n);
    case "regex":
      try {
        return new RegExp(needle, "i").test(haystack);
      } catch {
        return false;
      }
    case "contains":
    default:
      return h.includes(n);
  }
}

export async function applyRulesToTransaction(txnId: string) {
  const rules = await prisma.transactionRule.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (rules.length === 0) return null;

  const txn = await prisma.transaction.findUnique({
    where: { id: txnId },
    include: { tags: { include: { tag: true } } },
  });
  if (!txn) return null;

  for (const rule of rules) {
    const haystack = getField(txn, rule.matchField);
    if (!matches(haystack, rule.matchType, rule.matchValue)) continue;

    const data: any = {};
    if (rule.categoryId) {
      data.categoryId = rule.categoryId;
      const cat = await prisma.category.findUnique({ where: { id: rule.categoryId } });
      if (cat) data.category = cat.name;
    }
    if (rule.setReviewed) data.reviewed = true;

    await prisma.transaction.update({ where: { id: txnId }, data });

    if (rule.addTags) {
      const tagNames = rule.addTags.split(",").map((t) => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        await prisma.transactionTag.upsert({
          where: { transactionId_tagId: { transactionId: txnId, tagId: tag.id } },
          update: {},
          create: { transactionId: txnId, tagId: tag.id },
        });
      }
    }
    return rule; // first matching rule wins
  }
  return null;
}

/** Bulk-apply rules to all transactions without a manual category override. */
export async function applyRulesToAll() {
  const txns = await prisma.transaction.findMany({ select: { id: true } });
  let changed = 0;
  for (const t of txns) {
    const r = await applyRulesToTransaction(t.id);
    if (r) changed++;
  }
  return { total: txns.length, changed };
}
