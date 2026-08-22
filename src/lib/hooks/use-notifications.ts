import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationApi } from "@/lib/notification-api";
import { useAuth } from "@/lib/store/auth";

/** Single source of truth for notification data (backend-driven, auth only). */
export function useNotifications() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const enabled = Boolean(token);
  const scope = token ?? "guest";

  const listQ = useQuery({
    queryKey: ["notifications", scope],
    queryFn: () => notificationApi.list(token),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  const countQ = useQuery({
    queryKey: ["notifications", scope, "unread-count"],
    queryFn: () => notificationApi.unreadCount(token),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["notifications", scope] });
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
  const unreadCount = countQ.data ?? notifications.filter((n) => !n.read).length;

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
