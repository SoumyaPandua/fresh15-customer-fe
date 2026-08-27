import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "../types";

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
      pincode: "",
      city: "",
      addresses: [],
      activeAddressId: "",
      setPincode: (pincode, city) => set({ pincode: pincode.trim(), city: city ?? get().city }),
      addAddress: (a) => {
        const id = `guest-${Date.now()}`;
        const next = [...get().addresses, { ...a, id }];
        set({ addresses: next, activeAddressId: get().activeAddressId || id, pincode: a.pincode, city: a.city });
      },
      updateAddress: (id, patch) => set({
        addresses: get().addresses.map((a) => a.id === id ? { ...a, ...patch } : a),
      }),
      deleteAddress: (id) => {
        const list = get().addresses.filter((a) => a.id !== id);
        set({
          addresses: list,
          activeAddressId: get().activeAddressId === id ? list[0]?.id ?? "" : get().activeAddressId,
        });
      },
      setActive: (id) => {
        const address = get().addresses.find((item) => item.id === id);
        set({
          activeAddressId: id,
          pincode: address?.pincode ?? get().pincode,
          city: address?.city ?? get().city,
        });
      },
    }),
    { name: "fresh15-location-v2" },
  ),
);
