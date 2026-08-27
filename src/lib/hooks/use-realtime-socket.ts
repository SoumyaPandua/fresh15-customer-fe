import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/store/auth";
import { connectSocket, getSocket } from "@/lib/socket";

export function useRealtimeSocket() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    connectSocket(token);
    const socket = getSocket();
    if (!socket) return;

    const refreshOrders = () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", token] });
    };
    const refreshDelivery = () => {
      void queryClient.invalidateQueries({ queryKey: ["delivery", token] });
    };
    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", token] });
    };

    socket.on("order_updated", refreshOrders);
    socket.on("delivery_updated", refreshDelivery);
    socket.on("partner_assigned", refreshDelivery);
    socket.on("notification", refreshNotifications);

    const reconcile = () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", token] });
      void queryClient.invalidateQueries({ queryKey: ["delivery", token] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", token] });
    };
    socket.on("connect", reconcile);

    return () => {
      socket.off("order_updated", refreshOrders);
      socket.off("delivery_updated", refreshDelivery);
      socket.off("partner_assigned", refreshDelivery);
      socket.off("notification", refreshNotifications);
      socket.off("connect", reconcile);
    };
  }, [token, queryClient]);
}
