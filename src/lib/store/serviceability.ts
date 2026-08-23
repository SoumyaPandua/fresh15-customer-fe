import { create } from "zustand";

export type ServiceabilityStore = {
  addressKey: string;
  serviceable: boolean;
  baseDeliveryFee: number;
  freeDeliveryAbove: number;
  minOrder: number;
  etaMinutes: number | null;
  storeName: string;
  storeDistanceKm: number | null;
  zoneName: string;
  set: (value: Partial<Omit<ServiceabilityStore, "set" | "clear">>) => void;
  clear: () => void;
};

const initial = {
  addressKey: "",
  serviceable: false,
  baseDeliveryFee: 25,
  freeDeliveryAbove: 199,
  minOrder: 0,
  etaMinutes: null,
  storeName: "",
  storeDistanceKm: null,
  zoneName: "",
};

export const useServiceability = create<ServiceabilityStore>((set) => ({
  ...initial,
  set: (value) => set(value),
  clear: () => set(initial),
}));
