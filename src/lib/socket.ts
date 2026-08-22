// Centralized realtime socket service for the Fresh15 customer app.
// One socket instance for the whole app, auto reconnect, clean disconnect.
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./config";

export type OrderUpdatedEvent = {
  orderId?: string;
  deliveryId?: string;
  _id?: string;
  status?: string;
  deliveryStatus?: string;
  estimatedDeliveryTime?: string | number | null;
  [key: string]: unknown;
};

export type PartnerAssignedEvent = {
  orderId?: string;
  rider?: Record<string, unknown> | null;
  riderId?: Record<string, unknown> | string | null;
  partner?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type PartnerLocationEvent = {
  orderId?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  etaMinutes?: number;
  [key: string]: unknown;
};

export type CustomerNotificationEvent = {
  _id?: string;
  title?: string;
  message?: string;
  type?: string;
  metadata?: { orderId?: string } | null;
  [key: string]: unknown;
};

let socket: Socket | null = null;
let currentToken: string | null = null;

/** Returns the single socket instance, connecting it with the given JWT. */
export function connectSocket(token: string): Socket {
  if (typeof window === "undefined") throw new Error("Socket is browser-only");
  if (socket && currentToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  if (socket) disconnectSocket();

  currentToken = token;
  socket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: { token },
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
}
