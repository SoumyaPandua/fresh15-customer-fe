import { authedRequest } from "./cart-api";

export type DeliverySlotOption = {
  slotId: string;
  dateKey: string;
  label: string;
  type: "ASAP" | "FIXED";
  window: string;
  startsAt: string;
  endsAt: string;
  promisedAt: string;
  remainingCapacity: number;
  capacity: number;
  booked: number;
  cutoffAt: string;
  zone: { id: string; name: string };
  store: { id: string; name: string; code: string };
  workload: {
    zoneOrders: number;
    storeOrders: number;
    onlinePartners: number;
    activeDeliveries: number;
    partnerRemaining: number;
  };
};

export type AvailableDeliverySlots = {
  addressId: string;
  zone: { id: string; name: string };
  store: { id: string; name: string; code: string };
  slots: DeliverySlotOption[];
  generatedAt: string;
};

export const deliverySlotApi = {
  async available(token: string | null, addressId: string) {
    const res = await authedRequest<AvailableDeliverySlots>(
      `/api/delivery-slots/available/${encodeURIComponent(addressId)}`,
      { method: "GET" },
      token,
    );
    return res.data;
  },
};
