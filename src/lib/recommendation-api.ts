import { authedRequest } from "./cart-api";

export type RecommendationProduct = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;
  mrp: number;
  unit: string;
  availableStock: number;
  rating: number;
  reason: string;
  recommendationType?: string;
  score?: number;
};

export type RecommendationResult = {
  requestId: string;
  items: RecommendationProduct[];
};

export type PersonalizedOffer = {
  _id: string;
  id: string;
  title: string;
  description?: string;
  discount?: string;
  category?: string;
  ctaText?: string;
  targetType?: string;
  targetValue?: string;
  couponCode?: string;
  personalizationScore: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type RecommendationDashboard = {
  recommendations: RecommendationResult;
  smartBasket: RecommendationResult;
  offers: {
    requestId: string;
    items: PersonalizedOffer[];
  };
  generatedAt: string;
  mode: string;
};

export type RecommendationEventInput = {
  eventType: "IMPRESSION" | "CLICK" | "ADD_TO_CART" | "PURCHASE" | "DISMISS" | "OFFER_IMPRESSION" | "OFFER_CLICK";
  surface: "HOME" | "SEARCH" | "CATEGORY" | "PRODUCT" | "CART" | "CHECKOUT" | "OFFERS" | "OTHER";
  recommendationType: "PERSONALIZED" | "SMART_BASKET" | "OFFER" | "SEASONAL" | "POPULAR";
  productId?: string;
  offerId?: string;
  recommendationRequestId?: string;
  position?: number;
};

const sessionKey = "fresh15:recommendation-session";

const getSessionId = () => {
  if (typeof window === "undefined") return undefined;
  const existing = sessionStorage.getItem(sessionKey);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(sessionKey, id);
  return id;
};

const get = async <T>(token: string | null, path: string) => (await authedRequest<T>(path, { method: "GET" }, token)).data;

export const recommendationApi = {
  dashboard: (token: string | null) => get<RecommendationDashboard>(token, "/api/recommendations/dashboard"),
  recommendations: (token: string | null, limit = 10) => get<RecommendationResult>(token, `/api/recommendations/me?limit=${limit}`),
  smartBasket: (token: string | null, limit = 12) => get<RecommendationResult>(token, `/api/recommendations/smart-basket?limit=${limit}`),
  offers: (token: string | null, limit = 6) => get<{ requestId: string; items: PersonalizedOffer[] }>(token, `/api/recommendations/offers?limit=${limit}`),
  async recordEvents(token: string | null, events: RecommendationEventInput[]) {
    if (!token || !events.length) return { accepted: 0 };
    const payload = events.map((event) => ({ ...event, sessionId: getSessionId() }));
    return (await authedRequest<{ accepted: number }>("/api/recommendations/events", {
      method: "POST",
      body: JSON.stringify({ events: payload }),
    }, token)).data;
  },
};

export const trackRecommendationEvent = (token: string | null, event: RecommendationEventInput) => {
  if (!token) return;
  void recommendationApi.recordEvents(token, [event]).catch(() => {});
};
