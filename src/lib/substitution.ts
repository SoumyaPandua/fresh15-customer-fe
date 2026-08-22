// Shared out-of-stock substitution preference vocabulary (Fresh15 backend contract).
export const SUBSTITUTION_PREFERENCES = [
  "CALL_ME",
  "BEST_SIMILAR_ITEM",
  "DO_NOT_SUBSTITUTE",
  "SPECIFIC_ITEM",
] as const;

export type SubstitutionPreference = (typeof SUBSTITUTION_PREFERENCES)[number];

/** Safe default — the customer is always consulted unless they say otherwise. */
export const DEFAULT_SUBSTITUTION: SubstitutionPreference = "CALL_ME";

/** Legacy/alias names some responses may still use. */
const ALIASES: Record<string, SubstitutionPreference> = {
  BEST_SIMILAR: "BEST_SIMILAR_ITEM",
  SPECIFIC_PRODUCT: "SPECIFIC_ITEM",
};

export const SUBSTITUTION_LABELS: Record<SubstitutionPreference, string> = {
  CALL_ME: "Call me",
  BEST_SIMILAR_ITEM: "Best similar item",
  DO_NOT_SUBSTITUTE: "Do not substitute",
  SPECIFIC_ITEM: "Choose a replacement",
};

export const SUBSTITUTION_HINTS: Record<SubstitutionPreference, string> = {
  CALL_ME: "We'll ring you before replacing anything.",
  BEST_SIMILAR_ITEM: "Our picker chooses the closest match.",
  DO_NOT_SUBSTITUTE: "Item is refunded if unavailable.",
  SPECIFIC_ITEM: "Pick the exact item you'd accept instead.",
};

export function isSubstitutionPreference(value: unknown): value is SubstitutionPreference {
  return typeof value === "string" && (SUBSTITUTION_PREFERENCES as readonly string[]).includes(value);
}

/** Accepts a raw string OR the backend's `{ type, preferredReplacementProductId }` object. */
export function toPreferenceType(value: unknown): SubstitutionPreference | null {
  const raw =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? (value as Record<string, unknown>)["type"]
        : null;
  const upper = typeof raw === "string" ? raw.toUpperCase() : "";
  if (isSubstitutionPreference(upper)) return upper;
  return ALIASES[upper] ?? null;
}

export function normalizeSubstitution(value: unknown): SubstitutionPreference {
  return toPreferenceType(value) ?? DEFAULT_SUBSTITUTION;
}

/** Pulls the replacement product id out of a string/object substitution value. */
export function extractReplacementId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const ref = (value as Record<string, unknown>)["preferredReplacementProductId"];
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (typeof ref === "object") {
    const id = (ref as Record<string, unknown>)["_id"];
    return typeof id === "string" ? id : null;
  }
  return null;
}

/** Short human-readable badge text shown on cart/order lines. */
export function substitutionBadge(
  preference: SubstitutionPreference | undefined,
  replacementName?: string | null,
): string {
  const pref = preference ?? DEFAULT_SUBSTITUTION;
  if (pref === "SPECIFIC_ITEM") {
    return replacementName ? `Replace with ${replacementName}` : "Replacement not chosen";
  }
  return SUBSTITUTION_LABELS[pref];
}
