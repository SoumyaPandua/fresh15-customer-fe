import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "../types";
import { addresses as seed } from "../mock/addresses";

type LocationState = {
  pincode: string;
  city: string;
  addresses: Address[];
  activeAddressId: string;
  setPincode: (p: string, city?: string) => void;
  addAddress: (a: Omit<Address, "id">) => void;
  updateAddress: (id: string, patch: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setActive: (id: string) => void;
};

export const useLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      pincode: "411001",
      city: "Koregaon Park, Pune",
      addresses: seed,
      activeAddressId: seed[0].id,
      setPincode: (pincode, city) => set({ pincode, city: city ?? get().city }),
      addAddress: (a) => {
        const id = `a${Date.now()}`;
        set({ addresses: [...get().addresses, { ...a, id }] });
      },
      updateAddress: (id, patch) => set({ addresses: get().addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      deleteAddress: (id) => {
        const list = get().addresses.filter((a) => a.id !== id);
        set({
          addresses: list,
          activeAddressId: get().activeAddressId === id ? list[0]?.id ?? "" : get().activeAddressId,
        });
      },
      setActive: (id) => set({ activeAddressId: id }),
    }),
    { name: "fresh15-location" },
  ),
);
