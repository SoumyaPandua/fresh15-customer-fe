import { useEffect, useMemo, useRef, useState } from "react";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

type RouteResponse = {
  source?: MapCoordinate;
  destination?: MapCoordinate;
  distanceMeters?: number;
  durationSeconds?: number;
  etaMinutes?: number;
  geometry?: RouteGeometry;
};

type LiveDeliveryMapProps = {
  current: MapCoordinate;
  destination?: MapCoordinate | null;
  deliveryId?: string | null;
  token?: string | null;
  routeBaseUrl: string;
  partnerName?: string | null;
  etaMinutes?: number | null;
  orderStatus?: string | null;
  className?: string;
  heightClass?: string;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const TILE_COUNT = 5;

function clampLat(latitude: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function worldPixel(coordinate: MapCoordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;

  const latitude = clampLat(coordinate.latitude);

  const x = ((coordinate.longitude + 180) / 360) * scale;

  const sin = Math.sin((latitude * Math.PI) / 180);

  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;

  return { x, y };
}

function fitZoom(current: MapCoordinate, destination?: MapCoordinate | null) {
  if (!destination) {
    return 16;
  }

  const latSpan = Math.abs(current.latitude - destination.latitude);

  const lngSpan = Math.abs(current.longitude - destination.longitude);

  const span = Math.max(latSpan, lngSpan);

  if (span > 2) return 9;
  if (span > 0.8) return 10;
  if (span > 0.3) return 11;
  if (span > 0.12) return 12;
  if (span > 0.05) return 13;
  if (span > 0.02) return 14;
  if (span > 0.008) return 15;

  return 16;
}

function distanceMeters(a: MapCoordinate, b: MapCoordinate) {
  const earthRadius = 6371000;

  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;

  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const lat1 = (a.latitude * Math.PI) / 180;

  const lat2 = (b.latitude * Math.PI) / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function validCoordinate(value?: MapCoordinate | null): value is MapCoordinate {
  return Boolean(
    value &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180,
  );
}

export function LiveDeliveryMap({
  current,
  destination,
  deliveryId,
  token,
  routeBaseUrl,
  partnerName,
  etaMinutes,
  orderStatus,
  className,
  heightClass = "h-72",
}: LiveDeliveryMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [size, setSize] = useState({
    width: 640,
    height: 288,
  });

  const [zoomOffset, setZoomOffset] = useState(0);

  const [route, setRoute] = useState<RouteResponse | null>(null);

  const [routeError, setRouteError] = useState<string | null>(null);

  const lastRouteSource = useRef<MapCoordinate | null>(null);

  /*
   * ---------------------------------------------------------
   * Container size
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const element = hostRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();

      setSize({
        width: Math.max(280, Math.round(rect.width)),
        height: Math.max(220, Math.round(rect.height)),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Route
   * ---------------------------------------------------------
   *
   * Backend:
   *
   * GET /api/delivery/:deliveryId/route
   *
   * The backend is the source of truth for:
   * - destination
   * - route geometry
   * - distance
   * - duration
   * - ETA
   */

  const destinationKey = validCoordinate(destination) ? `${destination.latitude},${destination.longitude}` : "";

  useEffect(() => {
    if (!deliveryId || !token || !validCoordinate(current)) {
      return;
    }

    const previous = lastRouteSource.current;

    /*
     * Don't request the route for every tiny GPS
     * movement. Refresh after approximately 200m.
     *
     * If destination changes, however, always
     * request again.
     */
    if (
      previous &&
      distanceMeters(previous, current) < 200 &&
      destinationKey === (route?.destination ? `${route.destination.latitude},${route.destination.longitude}` : "")
    ) {
      return;
    }

    let cancelled = false;

    const controller = new AbortController();

    const loadRoute = async () => {
      try {
        setRouteError(null);

        const response = await fetch(`${routeBaseUrl}/api/delivery/${deliveryId}/route`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        let json: any = null;

        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          throw new Error(json?.message || "Route request failed");
        }

        if (!json?.success || !json?.data) {
          throw new Error(json?.message || "Route unavailable");
        }

        if (cancelled) {
          return;
        }

        const nextRoute = json.data as RouteResponse;

        setRoute(nextRoute);

        setRouteError(null);

        lastRouteSource.current = {
          latitude: current.latitude,
          longitude: current.longitude,
        };
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setRouteError(error instanceof Error ? error.message : "Route unavailable");
      }
    };

    void loadRoute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [current, deliveryId, destinationKey, routeBaseUrl, token]);

  /*
   * ---------------------------------------------------------
   * Destination
   * ---------------------------------------------------------
   *
   * Prefer the realtime/API destination.
   * If it isn't supplied by the frontend yet,
   * use destination returned by the backend route API.
   */

  const effectiveDestination = validCoordinate(destination)
    ? destination
    : validCoordinate(route?.destination)
      ? route.destination
      : null;

  /*
   * ---------------------------------------------------------
   * Map projection
   * ---------------------------------------------------------
   */

  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom(current, effectiveDestination) + zoomOffset));

  const center = useMemo<MapCoordinate>(() => {
    if (!validCoordinate(effectiveDestination)) {
      return current;
    }

    return {
      latitude: (current.latitude + effectiveDestination.latitude) / 2,

      longitude: (current.longitude + effectiveDestination.longitude) / 2,
    };
  }, [current, effectiveDestination]);

  const centerPx = worldPixel(center, zoom);

  /*
   * Important:
   *
   * Tile positioning must use the actual world
   * pixel coordinate of each tile.
   *
   * This fixes the previous map offset that could
   * make valid Pune coordinates display tiles from
   * the wrong geographical region.
   */

  const centerTileX = Math.floor(centerPx.x / TILE_SIZE);

  const centerTileY = Math.floor(centerPx.y / TILE_SIZE);

  const half = Math.floor(TILE_COUNT / 2);

  const project = (coordinate: MapCoordinate) => {
    const point = worldPixel(coordinate, zoom);

    return {
      x: point.x - centerPx.x + size.width / 2,

      y: point.y - centerPx.y + size.height / 2,
    };
  };

  /*
   * ---------------------------------------------------------
   * Route geometry
   * ---------------------------------------------------------
   */

  const routePoints =
    route?.geometry?.coordinates
      ?.map(([longitude, latitude]) =>
        project({
          latitude,
          longitude,
        }),
      )
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ?? [];

  const currentPoint = project(current);

  const destinationPoint = validCoordinate(effectiveDestination) ? project(effectiveDestination) : null;

  return (
    <div
      ref={hostRef}
      className={`relative overflow-hidden rounded-2xl border bg-muted shadow-sm ` + `${className ?? ""}`}
      aria-label="Live delivery map"
    >
      <div className={`relative w-full ${heightClass}`}>
        {/* -------------------------------------------------
            MAP TILES
        -------------------------------------------------- */}

        <div className="absolute inset-0 overflow-hidden bg-[#e8edf0]">
          {Array.from({
            length: TILE_COUNT * TILE_COUNT,
          }).map((_, index) => {
            const row = Math.floor(index / TILE_COUNT);

            const col = index % TILE_COUNT;

            const tileX = centerTileX + col - half;

            const tileY = centerTileY + row - half;

            const maxTile = 2 ** zoom;

            const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;

            if (tileY < 0 || tileY >= maxTile) {
              return null;
            }

            /*
             * IMPORTANT:
             *
             * Use global world-pixel coordinates.
             * Do NOT use the previous:
             *
             * col * TILE_SIZE + ...
             *
             * calculation.
             */

            const left = tileX * TILE_SIZE - centerPx.x + size.width / 2;

            const top = tileY * TILE_SIZE - centerPx.y + size.height / 2;

            return (
              <img
                key={`${zoom}-${tileX}-${tileY}`}
                src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`}
                alt=""
                draggable={false}
                className="absolute h-64 w-64 max-w-none select-none"
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  left,
                  top,
                }}
              />
            );
          })}
        </div>

        {/* -------------------------------------------------
            ROUTE
        -------------------------------------------------- */}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
        >
          {routePoints.length > 1 && (
            <>
              <polyline
                points={routePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="rgba(255,255,255,.95)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <polyline
                points={routePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>

        {/* -------------------------------------------------
            DESTINATION MARKER
        -------------------------------------------------- */}

        {destinationPoint && (
          <div
            className="absolute z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-card shadow-lg ring-2 ring-white"
            style={{
              left: destinationPoint.x,
              top: destinationPoint.y,
            }}
            title="Delivery destination"
          >
            <span className="h-3 w-3 rounded-full bg-destructive" />
          </div>
        )}

        {/* -------------------------------------------------
            PARTNER MARKER
        -------------------------------------------------- */}

        <div
          className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: currentPoint.x,
            top: currentPoint.y,
          }}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-white/90">
            <span className="text-lg">🚚</span>
          </div>

          <div className="mx-auto mt-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
        </div>

        {/* -------------------------------------------------
            HEADER
        -------------------------------------------------- */}

        <div className="absolute left-3 top-3 z-40 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold shadow">
          {partnerName ?? "Delivery partner"}

          {orderStatus ? ` · ${orderStatus}` : ""}
        </div>

        {/* -------------------------------------------------
            ZOOM
        -------------------------------------------------- */}

        <div className="absolute right-3 top-3 z-40 flex gap-1 rounded-xl bg-card/95 p-1 shadow">
          <button
            type="button"
            onClick={() => setZoomOffset((value) => Math.min(4, value + 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold hover:bg-muted"
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setZoomOffset((value) => Math.max(-4, value - 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold hover:bg-muted"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* -------------------------------------------------
            OSM ATTRIBUTION
        -------------------------------------------------- */}

        <div className="absolute bottom-2 left-2 z-40 rounded bg-card/90 px-2 py-1 text-[10px] text-muted-foreground shadow">
          © OpenStreetMap contributors
        </div>

        {/* -------------------------------------------------
            ROUTE ERROR
        -------------------------------------------------- */}

        {routeError && (
          <div className="absolute bottom-2 right-2 z-40 max-w-[70%] rounded bg-card/90 px-2 py-1 text-right text-[10px] text-muted-foreground shadow">
            Route unavailable · live position still active
          </div>
        )}
      </div>

      {/* ---------------------------------------------------
          FOOTER
      ---------------------------------------------------- */}

      <div className="flex items-center justify-between border-t bg-card px-4 py-2 text-xs text-muted-foreground">
        <span className="font-semibold">{orderStatus ?? "Live tracking"}</span>

        <span>
          {etaMinutes ? `ETA ${etaMinutes} min` : route?.etaMinutes ? `ETA ${route.etaMinutes} min` : "ETA —"}
        </span>
      </div>
    </div>
  );
}
