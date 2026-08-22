import { authedRequest } from "./cart-api";

export type LoyaltyLedgerEntry = { _id: string; type: string; points: number; balanceAfter: number; description?: string; createdAt: string; orderId?: string };
export type LoyaltyOverview = {
  wallet: { balance: number; lifetimeEarned: number; lifetimeRedeemed: number; referralCode: string; referredByUserId?: string | null };
  ledger: LoyaltyLedgerEntry[];
  referral: { code: string; referredCount: number; successfulReferrals: number };
  rules: { RUPEES_PER_EARN_POINT: number; POINTS_PER_RUPEE_REDEEMED: number; FIRST_REORDER_BONUS: number; REFERRER_REWARD: number; REFERRED_FRIEND_REWARD: number; MAX_REDEMPTION_PERCENT: number; MIN_REDEMPTION_POINTS: number };
  redemptionValueRupees: number;
};
export type RedemptionPreview = { balance: number; maxRedeemablePoints: number; pointsToRedeem: number; discountRupees: number; capPercent: number; minimumPoints: number };

export const loyaltyApi = {
  async get(token: string | null) { return (await authedRequest<LoyaltyOverview>("/api/loyalty/me", { method: "GET" }, token)).data; },
  async applyReferral(token: string | null, code: string) { return authedRequest<{ referralCode: string; applied: boolean }>("/api/loyalty/referral/apply", { method: "POST", body: JSON.stringify({ code }) }, token); },
  async preview(token: string | null, subtotal: number, points: number) { return (await authedRequest<RedemptionPreview>("/api/loyalty/redemption/preview", { method: "POST", body: JSON.stringify({ subtotal, points }) }, token)).data; },
};
