import type { BoundaryCollection } from "./geo";

/**
 * Bundled restricted-zone geometry (ships in the JS bundle, no fetch offline).
 * The six MPA polygons are copied verbatim from
 * backend/app/geospatial/protected_areas.py; the backend has no EEZ/IMBL
 * geometry, so the one IMBL line here is the India–Sri Lanka Palk Bay boundary
 * (1974 agreement, approximate turning points). Coordinates are [lon, lat].
 *
 * "Verbatim" is load-bearing and is enforced, not trusted: this copy was
 * written before P0-3 and still had the four oversized rings that fix scaled
 * down -- Gulf of Kutch 4.35x its published area, Gulf of Mannar 2.82x, Malvan
 * 2.44x, Coringa 1.87x. At that size Rameswaram and Malvan harbour tested as
 * INSIDE an MPA, so the browser flagged a fisherman sitting in his own home
 * port. All four are resynced. backend/tests/test_frontend_boundaries_match.py
 * fails the build if the two files diverge again.
 *
 * The geometry is approximate on both sides: simplified quadrilaterals scaled
 * to published areas, not gazetted survey geometry.
 */
export const BOUNDARIES: BoundaryCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "mpa_coringa_mangroves",
        name: "Coringa Wildlife Sanctuary & Marine Zone",
        kind: "MPA",
        restriction: "Mechanized fishing restricted (Hope Island mouth)",
        authority: "AP Forest Dept (Godavari Estuary)",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[82.2337, 16.8], [82.3798, 16.9096], [82.4163, 16.8], [82.2702, 16.6904], [82.2337, 16.8]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "mpa_gahirmatha",
        name: "Gahirmatha Marine Sanctuary",
        kind: "MPA",
        restriction: "Strict no-take: trawling prohibited within 20 km (Nov–May)",
        authority: "MoEFCC / Odisha Forest Dept",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[86.75, 20.6], [87.15, 20.8], [87.25, 20.55], [86.95, 20.35], [86.75, 20.6]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "mpa_gulf_of_mannar",
        name: "Gulf of Mannar Marine National Park",
        kind: "MPA",
        restriction: "Trawling and purse seining prohibited",
        authority: "MoEFCC / Tamil Nadu Forest Dept",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[79.0163, 9.1051], [79.2842, 9.2539], [79.3438, 9.1348], [79.1056, 8.9562], [79.0163, 9.1051]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "mpa_malvan",
        name: "Malvan Marine Sanctuary",
        kind: "MPA",
        restriction: "Trawling and anchoring banned in core reef zones",
        authority: "MoEFCC / Maharashtra Mangrove Cell",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.4216, 16.0218], [73.4856, 16.0602], [73.4984, 16.0218], [73.4344, 15.9962], [73.4216, 16.0218]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "mpa_kutch_jamnagar",
        name: "Marine National Park & Sanctuary, Gulf of Kutch",
        kind: "MPA",
        restriction: "Strict no-take: industrial vessel entry banned",
        authority: "MoEFCC / Gujarat Forest Dept",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[69.4668, 22.4456], [69.8983, 22.6373], [69.9462, 22.4935], [69.5387, 22.3736], [69.4668, 22.4456]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "mpa_mahatma_gandhi",
        name: "Mahatma Gandhi Marine National Park (Wandoor)",
        kind: "MPA",
        restriction: "Strict no-take: commercial fishing prohibited",
        authority: "A&N Forest Dept / MoEFCC",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[92.5, 11.5], [92.65, 11.6], [92.68, 11.45], [92.52, 11.38], [92.5, 11.5]]],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "imbl_india_srilanka_palk",
        name: "India–Sri Lanka IMBL (Palk Bay)",
        kind: "IMBL",
        restriction: "Do not cross: Sri Lankan waters beyond this line",
        authority: "MEA / Indian Coast Guard (1974 agreement)",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.05, 10.08],
          [79.86, 9.98],
          [79.7, 9.74],
          [79.53, 9.45],
          [79.52, 9.22],
          [79.36, 9.06],
          [79.2, 8.85],
        ],
      },
    },
  ],
};
