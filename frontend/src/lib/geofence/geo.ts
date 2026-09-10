/**
 * Pure geofence maths — no deps, no DOM, runs offline in the JS bundle.
 * GeoJSON convention throughout: coordinates are [lon, lat].
 */

export type LatLon = { lat: number; lon: number };
export type BoundaryKind = "MPA" | "EEZ" | "IMBL";

export interface BoundaryProps {
  id: string;
  name: string;
  kind: BoundaryKind;
  restriction: string;
  authority: string;
}

export interface BoundaryFeature {
  type: "Feature";
  properties: BoundaryProps;
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "LineString"; coordinates: number[][] };
}

export interface BoundaryCollection {
  type: "FeatureCollection";
  features: BoundaryFeature[];
}

export type GeofenceLevel = "clear" | "advisory" | "warning" | "severe";

export interface GeofenceStatus {
  level: GeofenceLevel;
  /** Polygon the point is inside, if any. */
  inside: BoundaryFeature | null;
  /** Closest boundary edge and its distance (0 when inside). */
  nearest: { feature: BoundaryFeature; distanceKm: number } | null;
}

/** Calibration knob: inside a polygon or <= severeKm -> severe; <= warningKm -> warning; else advisory. */
export const THRESHOLDS = { warningKm: 20, severeKm: 5 };

const R_KM = 6371.0088;
const KM_PER_DEG = (Math.PI / 180) * R_KM; // ~111.2

export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/** Ray casting against a single ring ([lon, lat] pairs). Holes are ignored by callers. */
export function pointInPolygon(pt: LatLon, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > pt.lat !== yj > pt.lat &&
      pt.lon < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Point-to-segment distance in km.
 * ponytail: planar approximation with cos(lat) lon scaling — <0.5 % error under
 * ~100 km at Indian latitudes; swap for geodesic cross-track if we ever grade EEZ
 * lines hundreds of km out.
 */
function segmentDistanceKm(pt: LatLon, a: number[], b: number[]): number {
  const k = Math.cos((pt.lat * Math.PI) / 180) * KM_PER_DEG;
  const ax = (a[0] - pt.lon) * k;
  const ay = (a[1] - pt.lat) * KM_PER_DEG;
  const bx = (b[0] - pt.lon) * k;
  const by = (b[1] - pt.lat) * KM_PER_DEG;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const cx = ax + u * dx;
  const cy = ay + u * dy;
  return Math.sqrt(cx * cx + cy * cy);
}

/** Min distance from the point to any edge of the feature (polygon outer ring or line). */
export function distanceToBoundaryKm(pt: LatLon, feature: BoundaryFeature): number {
  const path =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates;
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    best = Math.min(best, segmentDistanceKm(pt, path[i - 1], path[i]));
  }
  return best;
}

export function evaluate(pt: LatLon, fc: BoundaryCollection): GeofenceStatus {
  let inside: BoundaryFeature | null = null;
  let nearest: GeofenceStatus["nearest"] = null;
  for (const f of fc.features) {
    if (!inside && f.geometry.type === "Polygon" && pointInPolygon(pt, f.geometry.coordinates[0])) {
      inside = f;
    }
    const distanceKm = inside === f ? 0 : distanceToBoundaryKm(pt, f);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { feature: f, distanceKm };
  }
  const level: GeofenceLevel = !nearest
    ? "clear"
    : inside || nearest.distanceKm <= THRESHOLDS.severeKm
      ? "severe"
      : nearest.distanceKm <= THRESHOLDS.warningKm
        ? "warning"
        : "advisory";
  return { level, inside, nearest };
}

/** Runnable sanity check (node/tsx). Throws on the first failed assertion, returns true otherwise. */
export function selfCheckGeofence(): true {
  // Lazy requires keep geo.ts dependency-free for the bundle graph.
  const { BOUNDARIES } = require("./boundaries") as typeof import("./boundaries");
  const { DEMO_TRACK } = require("./demoTrack") as typeof import("./demoTrack");
  const ok = (cond: boolean, msg: string) => {
    if (!cond) throw new Error("selfCheckGeofence: " + msg);
  };
  const coringa = BOUNDARIES.features.find((f) => f.properties.id === "mpa_coringa_mangroves")!;
  const port = { lat: 16.9891, lon: 82.2475 };
  ok(!pointInPolygon(port, coringa.geometry.coordinates[0] as number[][]), "Kakinada port must be outside Coringa");
  ok(evaluate({ lat: 16.82, lon: 82.32 }, BOUNDARIES).level === "severe", "Coringa centre must be severe");
  // 15 km due east of the Coringa east vertex (82.45, 16.80): 15 / (111.2 * cos 16.8 deg) = 0.141 deg
  const far15 = evaluate({ lat: 16.8, lon: 82.45 + 0.141 }, BOUNDARIES);
  ok(far15.level === "warning", `15 km point must be warning, got ${far15.level} @ ${far15.nearest?.distanceKm}`);
  const first = evaluate(DEMO_TRACK[0], BOUNDARIES);
  ok(first.level === "advisory" || first.level === "clear", `track start must be advisory, got ${first.level}`);
  ok(evaluate(DEMO_TRACK[DEMO_TRACK.length - 1], BOUNDARIES).level === "severe", "track end must be severe");
  ok(Math.abs(haversineKm(port, { lat: 17.6868, lon: 83.2185 }) - 128) < 3, "Kakinada to Vizag should be about 128 km");
  return true;
}
