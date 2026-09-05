import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationApi } from "@/lib/notification-api";
import { useAuth } from "@/lib/store/auth";
import { connectSocket, type CustomerNotificationEvent } from "@/lib/socket";

/** Single source of truth for notification data (backend-driven, auth only). */
export function useNotifications() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const enabled = Boolean(token);
  const scope = token ?? "guest";

  const listKey = ["notifications", scope] as const;
  const countKey = ["notifications", scope, "unread-count"] as const;

  const listQ = useQuery({
    queryKey: listKey,
    queryFn: () => notificationApi.list(token),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const countQ = useQuery({
    queryKey: countKey,
    queryFn: () => notificationApi.unreadCount(token),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    const joinCustomerRoom = () => {
      socket.emit("join:customer");
    };

    const invalidateNotifications = () => {
      void qc.invalidateQueries({ queryKey: listKey });
      void qc.invalidateQueries({ queryKey: countKey });
    };

    const handleNotification = (event: CustomerNotificationEvent) => {
      if (!event) return;
      invalidateNotifications();
    };

    socket.on("connect", joinCustomerRoom);
    socket.on("customer:notification", handleNotification);

    if (socket.connected) joinCustomerRoom();

    return () => {
      socket.off("connect", joinCustomerRoom);
      socket.off("customer:notification", handleNotification);
    };
  }, [token, qc, scope]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: listKey });
    void qc.invalidateQueries({ queryKey: countKey });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(token, id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(token),
    onSuccess: () => {
      invalidate();
      toast.success("All notifications marked as read");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationApi.remove(token, id),
    onSuccess: () => {
      invalidate();
      toast.success("Notification removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const notifications = listQ.data ?? [];
  const unreadCount =
    countQ.data ?? notifications.filter((n) => !n.read).length;

  return {
    isAuthed: enabled,
    notifications,
    unreadCount,
    isLoading: enabled && listQ.isLoading,
    markRead,
    markAllRead,
    remove,
  };
}
