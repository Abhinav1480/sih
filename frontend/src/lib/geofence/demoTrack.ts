/**
 * Bundled demo GPS track: 60 fixes, 1 track-second apart, drifting WNW from
 * open water off Kakinada into the Coringa sanctuary polygon. Straight-line
 * interpolation between START and END; the transitions are verified against
 * boundaries.ts by selfCheckGeofence().
 */
const START = { lat: 16.87, lon: 82.66 };
const END = { lat: 16.9, lon: 82.4 };
const POINTS = 60;

export const DEMO_TRACK: { t: number; lat: number; lon: number }[] = Array.from(
  { length: POINTS },
  (_, i) => {
    const u = i / (POINTS - 1);
    return {
      t: i,
      lat: +(START.lat + (END.lat - START.lat) * u).toFixed(5),
      lon: +(START.lon + (END.lon - START.lon) * u).toFixed(5),
    };
  }
);
