import type { SpendCategory } from "./categories";

/**
 * Reference dataset for the recommendation engine.
 *
 * IMPORTANT: card names, fees, and reward rates below are illustrative
 * placeholders meant to show the shape of the data — annual fees, reward
 * rates, and signup bonuses change constantly and vary by applicant.
 * Before relying on this, edit the entries (or add your own) with figures
 * you've verified directly on the issuer's site. This app does not fetch
 * live rates and is not a substitute for financial advice.
 */
export type CreditCardSeed = {
  issuer: string;
  name: string;
  annualFee: number;
  rewards: Partial<Record<SpendCategory, number>>; // reward rate, e.g. 3 = 3x/3%
  signupBonus?: string;
  notes?: string;
  applyUrl?: string;
};

export const CREDIT_CARD_SEED_DATA: CreditCardSeed[] = [
  {
    issuer: "Example Bank",
    name: "Everyday Cashback Card",
    annualFee: 0,
    rewards: { groceries: 3, streaming: 3, gas: 2, other: 1 },
    signupBonus: "Verify current offer on issuer site",
    notes: "No annual fee, flat rate on everything else.",
    applyUrl: "https://www.nerdwallet.com/best/credit-cards/cash-back",
  },
  {
    issuer: "Example Bank",
    name: "Dining & Travel Rewards Card",
    annualFee: 95,
    rewards: { dining: 3, travel: 3, other: 1 },
    signupBonus: "Verify current offer on issuer site",
    notes: "Points typically transfer to travel partners; annual fee needs enough spend to justify.",
    applyUrl: "https://www.nerdwallet.com/best/credit-cards/travel",
  },
  {
    issuer: "Example Bank",
    name: "Flat-Rate 2% Card",
    annualFee: 0,
    rewards: { other: 2 },
    notes: "Simple flat 2% back on every purchase, no category tracking needed.",
    applyUrl: "https://www.nerdwallet.com/best/credit-cards/flat-rate-cash-back",
  },
  {
    issuer: "Example Bank",
    name: "Gas & Grocery Card",
    annualFee: 0,
    rewards: { gas: 4, groceries: 4, drugstores: 2, other: 1 },
    notes: "Strong at the pump and grocery store; rate often capped at a quarterly/annual spend limit.",
    applyUrl: "https://www.nerdwallet.com/best/credit-cards/gas",
  },
  {
    issuer: "Example Bank",
    name: "Premium Travel Card",
    annualFee: 550,
    rewards: { travel: 5, dining: 3, other: 1 },
    signupBonus: "Verify current offer on issuer site",
    notes: "High annual fee offset by lounge access / travel credits — only worth it with heavy travel spend.",
    applyUrl: "https://www.nerdwallet.com/best/credit-cards/travel",
  },
];

export type ScoredCard = CreditCardSeed & {
  id?: string;
  estimatedAnnualRewardValue: number;
  netAnnualValue: number;
};

/**
 * Scores each card against the user's trailing spend by category.
 * spendByCategory values should be dollars spent in that category over
 * whatever window the caller chose (e.g. trailing 12 months).
 * Reward value is estimated assuming 1 point/%% = $0.01, a common rough
 * approximation — real redemption value varies by program.
 */
export function scoreCards(
  cards: CreditCardSeed[],
  spendByCategory: Partial<Record<SpendCategory, number>>
): ScoredCard[] {
  return cards
    .map((card) => {
      let estimatedAnnualRewardValue = 0;
      for (const [category, spend] of Object.entries(spendByCategory)) {
        const rate = card.rewards[category as SpendCategory] ?? card.rewards.other ?? 1;
        estimatedAnnualRewardValue += ((spend ?? 0) * rate) / 100;
      }
      const netAnnualValue = estimatedAnnualRewardValue - card.annualFee;
      return { ...card, estimatedAnnualRewardValue, netAnnualValue };
    })
    .sort((a, b) => b.netAnnualValue - a.netAnnualValue);
}
