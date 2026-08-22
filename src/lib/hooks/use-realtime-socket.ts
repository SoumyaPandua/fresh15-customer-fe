import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/store/auth";
import { connectSocket, disconnectSocket, type CustomerNotificationEvent } from "@/lib/socket";

/**
 * App-wide realtime connection. Connects once the customer is authenticated,
 * joins the customer room and keeps notification data fresh in realtime.
 */
export function useRealtimeSocket() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    const socket = connectSocket(token);

    const joinCustomer = () => socket.emit("join:customer");
    if (socket.connected) joinCustomer();
    socket.on("connect", joinCustomer);

    const onNotification = (payload: CustomerNotificationEvent) => {
      void qc.invalidateQueries({ queryKey: ["notifications", token] });
      const message = payload?.title ?? payload?.message;
      if (message) toast(String(message), { description: payload?.title ? payload?.message : undefined });
    };
    // Only the orders list is refreshed app-wide; the order detail screen has its
    // own realtime hook that refreshes that order + its delivery.
    const onOrderUpdated = () => {
      void qc.invalidateQueries({ queryKey: ["orders"] });
    };
    const onDeliveryUpdated = onOrderUpdated;
    const onPartnerAssigned = onOrderUpdated;

    socket.on("customer:notification", onNotification);
    socket.on("order:updated", onOrderUpdated);
    socket.on("delivery:updated", onDeliveryUpdated);
    socket.on("partner:assigned", onPartnerAssigned);

    return () => {
      socket.off("connect", joinCustomer);
      socket.off("customer:notification", onNotification);
      socket.off("order:updated", onOrderUpdated);
      socket.off("delivery:updated", onDeliveryUpdated);
      socket.off("partner:assigned", onPartnerAssigned);
      disconnectSocket();
    };
  }, [token, qc]);
}
