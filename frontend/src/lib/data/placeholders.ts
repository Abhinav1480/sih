/**
 * The one module allowed to hold placeholder values.
 *
 * DEFAULT_LOCATION is the position every bundled capture was requested at
 * (Kakinada, off the Andhra coast). It is used only when the phone has no
 * GPS fix yet, so that POST /api/query always carries a `user_location` as
 * the contract requires. It is a request parameter, never a measurement, and
 * the answer names the location the server actually used.
 */
export const DEFAULT_LOCATION = { lat: 16.9891, lon: 82.2475 } as const;
