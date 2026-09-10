/**
 * Coastal harbours, copied from backend/app/geospatial/boundaries.py by
 * tools/gen_harbours.py so the phone can find the nearest one with no network.
 * Reference data, not placeholder data: these are real harbour positions.
 */

export interface Harbour { name: string; lat: number; lon: number }

export const HARBOURS: Harbour[] = [
  { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185 },
  { name: "Kakinada", lat: 16.9891, lon: 82.2475 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Paradip", lat: 20.2644, lon: 86.6667 },
  { name: "Mumbai", lat: 18.9438, lon: 72.8354 },
  { name: "Kochi", lat: 9.9312, lon: 76.2673 },
  { name: "Mangalore", lat: 12.9141, lon: 74.8560 },
  { name: "Thoothukudi (Tuticorin)", lat: 8.7642, lon: 78.1348 },
  { name: "Porbandar", lat: 21.6417, lon: 69.6293 },
  { name: "Port Blair", lat: 11.6234, lon: 92.7265 },
  { name: "Machilipatnam", lat: 16.1875, lon: 81.1389 },
  { name: "Goa (Mormugao)", lat: 15.4056, lon: 73.8014 },
  { name: "Digha Coast", lat: 21.6266, lon: 87.5074 },
  { name: "Gopalpur", lat: 19.3144, lon: 84.9655 },
  { name: "Puducherry", lat: 11.9416, lon: 79.8083 },
  { name: "Veraval", lat: 20.9077, lon: 70.3678 },
  { name: "Haldia", lat: 22.0667, lon: 88.0667 },
  { name: "Bhavnagar", lat: 21.7645, lon: 72.1519 },
  { name: "Ratnagiri", lat: 16.9902, lon: 73.3120 },
  { name: "Malvan", lat: 16.0558, lon: 73.4688 },
  { name: "Nagapattinam", lat: 10.7672, lon: 79.8428 },
  { name: "Beypore (Kozhikode)", lat: 11.1611, lon: 75.8058 },
  { name: "Rameswaram", lat: 9.2876, lon: 79.3129 },
];
