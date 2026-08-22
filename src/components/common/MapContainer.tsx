import { API_BASE_URL } from "@/lib/config";
import { Suspense, lazy } from "react";

// Map code is only downloaded when an active delivery actually needs tracking.
const LiveDeliveryMap = lazy(() =>
  import("./LiveDeliveryMap").then((m) => ({ default: m.LiveDeliveryMap })),
);
import { useAuth } from "@/lib/store/auth";

export type MapContainerProps = {
  latitude?: number | null;
  longitude?: number | null;
  destination?: {
    latitude: number;
    longitude: number;
  } | null;
  deliveryId?: string | null;
  partnerName?: string | null;
  eta?: number | string | null;
  orderStatus?: string | null;
  className?: string;
};

export function MapContainer({
  latitude,
  longitude,
  destination,
  deliveryId,
  partnerName,
  eta,
  orderStatus,
  className,
}: MapContainerProps) {
  const token = useAuth((state) => state.token);

  const hasCurrent =
    Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);

  if (
    !hasCurrent ||
    String(orderStatus ?? "")
      .toLowerCase()
      .includes("delivered")
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LiveDeliveryMap
        className={className}
        current={{
          latitude: Number(latitude),
          longitude: Number(longitude),
        }}
        destination={destination ?? null}
        deliveryId={deliveryId ?? null}
        token={token}
        routeBaseUrl={API_BASE_URL}
        partnerName={partnerName ?? "Delivery partner"}
        etaMinutes={eta !== null && eta !== undefined ? Number(eta) : null}
        orderStatus={orderStatus ?? null}
      />
    </Suspense>
  );
}
