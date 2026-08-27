import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkServiceability } from "@/lib/serviceability-api";
import { useAuth } from "@/lib/store/auth";
import { useAddressBook } from "@/lib/hooks/use-address-book";
import { useServiceability as useServiceabilityStore } from "@/lib/store/serviceability";

export function useServiceabilityQuery() {
  const token = useAuth((s) => s.token);
  const { activeAddress, addressReady } = useAddressBook();
  const set = useServiceabilityStore((s) => s.set);

  const query = useQuery({
    queryKey: ["serviceability", token ?? "guest", activeAddress?.id ?? ""],
    queryFn: () => checkServiceability({
      pincode: activeAddress?.pincode,
      latitude: activeAddress?.latitude,
      longitude: activeAddress?.longitude,
    }),
    enabled: Boolean(activeAddress && addressReady),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!activeAddress) {
      set({ addressKey: "", isLoading: false, serviceable: false, storeName: "", zoneName: "", etaMinutes: null });
      return;
    }

    set({ addressKey: activeAddress.id, isLoading: query.isFetching, serviceable: false });

    if (query.data) {
      const result = query.data;
      set({
        addressKey: activeAddress.id,
        isLoading: false,
        serviceable: true,
        baseDeliveryFee: result.baseDeliveryFee,
        freeDeliveryAbove: result.freeDeliveryAbove,
        minOrder: result.minOrder,
        etaMinutes: result.etaMinutes,
        storeName: result.store.name,
        storeDistanceKm: result.store.distanceKm,
        zoneName: result.zone.name,
      });
      return;
    }

    if (query.error) {
      set({ addressKey: activeAddress.id, isLoading: false, serviceable: false, etaMinutes: null });
    }
  }, [activeAddress?.id, activeAddress?.pincode, activeAddress?.latitude, activeAddress?.longitude, query.data, query.error, query.isFetching, set]);

  return query;
}
