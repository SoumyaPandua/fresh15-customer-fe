import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/store/auth";
import {
  connectSocket,
  getSocket,
  type OrderUpdatedEvent,
  type PartnerAssignedEvent,
  type PartnerLocationEvent,
} from "@/lib/socket";

export type PartnerLocation = { latitude: number; longitude: number; etaMinutes?: number | undefined };

/**
 * Realtime order tracking. Joins the order room and refreshes order/delivery
 * data on socket events — no polling is used while tracking.
 */
export function useOrderRealtime(orderId: string) {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [partnerLocation, setPartnerLocation] = useState<PartnerLocation | null>(null);

  useEffect(() => {
    if (!token || !orderId || typeof window === "undefined") return;
    const socket = getSocket() ?? connectSocket(token);

    const joinOrder = () => socket.emit("join:order", { orderId });
    if (socket.connected) joinOrder();
    socket.on("connect", joinOrder);

    const refresh = (_payload?: unknown) => {
      void qc.invalidateQueries({ queryKey: ["order", token ?? "guest", orderId] });
      void qc.invalidateQueries({ queryKey: ["delivery", orderId] });
    };

    const onOrderUpdated = (payload: OrderUpdatedEvent) => {
      if (String(payload?.orderStatus ?? "").toUpperCase() === "DELIVERED") {
        setPartnerLocation(null);
      }
      refresh(payload);
    };
    const onPartnerAssigned = (payload: PartnerAssignedEvent) => refresh(payload);
    const onDeliveryUpdated = (payload: OrderUpdatedEvent) => {
      if (String(payload?.deliveryStatus ?? payload?.orderStatus ?? "").toUpperCase() === "DELIVERED") {
        setPartnerLocation(null);
      }
      refresh(payload);
    };
    const onPartnerLocation = (payload: PartnerLocationEvent) => {
      if (String(payload?.deliveryStatus ?? payload?.orderStatus ?? "").toUpperCase() === "DELIVERED") {
        setPartnerLocation(null);
        return;
      }
      const lat = payload?.latitude ?? payload?.lat;
      const lng = payload?.longitude ?? payload?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      setPartnerLocation({ latitude: lat, longitude: lng, etaMinutes: payload?.etaMinutes });
    };

    socket.on("order:updated", onOrderUpdated);
    socket.on("delivery:updated", onDeliveryUpdated);
    socket.on("partner:assigned", onPartnerAssigned);
    socket.on("partner:location", onPartnerLocation);

    return () => {
      socket.off("connect", joinOrder);
      socket.off("order:updated", onOrderUpdated);
      socket.off("delivery:updated", onDeliveryUpdated);
      socket.off("partner:assigned", onPartnerAssigned);
      socket.off("partner:location", onPartnerLocation);
    };
  }, [token, orderId, qc]);

  return { partnerLocation };
}
