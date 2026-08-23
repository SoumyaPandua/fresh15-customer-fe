import { API_BASE_URL } from "./config";

export type ServiceabilityLocation = {
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  subtotal?: number;
};

export type ServiceabilitySlot = {
  slotId: string;
  dateKey: string;
  label: string;
  type: "ASAP" | "FIXED";
  window: string;
  startsAt: string;
  endsAt: string;
  promisedAt: string;
  etaMinutes: number;
  remainingCapacity: number;
  capacity: number;
  booked: number;
  cutoffAt: string;
  zone: { id: string; name: string };
  store: { id: string; name: string; code: string };
};

export type ServiceabilityResult = {
  serviceable: boolean;
  matchedBy: "PINCODE" | "COORDINATES" | "DEFAULT" | string;
  pincode: string | null;
  location: { latitude: number; longitude: number } | null;
  zone: {
    id: string;
    name: string;
    city?: string;
    fee: number;
    minOrder: number;
    serviceRadiusKm: number;
  };
  store: { id: string; name: string; code: string; distanceKm: number | null };
  etaMinutes: number | null;
  deliveryFee: number;
  baseDeliveryFee: number;
  freeDeliveryAbove: number;
  minOrder: number;
  slots: ServiceabilitySlot[];
  generatedAt: string;
};

export class ServiceabilityError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "SERVICEABILITY_ERROR", status = 422) {
    super(message);
    this.name = "ServiceabilityError";
    this.code = code;
    this.status = status;
  }
}

function qs(input: ServiceabilityLocation) {
  const params = new URLSearchParams();
  if (input.pincode?.trim()) params.set("pincode", input.pincode.trim());
  if (input.latitude != null && input.longitude != null) {
    params.set("latitude", String(input.latitude));
    params.set("longitude", String(input.longitude));
  }
  if (input.subtotal != null) params.set("subtotal", String(input.subtotal));
  return params.toString();
}

export async function checkServiceability(input: ServiceabilityLocation): Promise<ServiceabilityResult> {
  const query = qs(input);
  if (!query) throw new ServiceabilityError("Enter a pincode or use your current location.", "LOCATION_REQUIRED", 400);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/delivery-slots/serviceability?${query}`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new ServiceabilityError("Unable to check delivery availability right now.", "NETWORK_ERROR", 0);
  }

  let json: any = null;
  try { json = await response.json(); } catch { /* noop */ }

  if (!response.ok || !json?.success) {
    throw new ServiceabilityError(
      json?.message || "We do not currently deliver to this location.",
      json?.code || "NOT_SERVICEABLE",
      response.status,
    );
  }
  return json.data as ServiceabilityResult;
}
