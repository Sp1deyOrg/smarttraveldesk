import type { Place } from "./types";

interface CityGeo {
  /** Matches the city name the planner or rule parser returns. */
  names: string[];
  airport: { name: string; lat: number; lng: number };
  /** Main business district, used as the meeting area until the venue is geocoded. */
  business: { name: string; lat: number; lng: number };
}

/** Airport and business district for the cities the planner recognises. */
const CITY_GEO: CityGeo[] = [
  {
    names: ["mumbai", "bombay"],
    airport: { name: "Chhatrapati Shivaji Intl (BOM)", lat: 19.0896, lng: 72.8656 },
    business: { name: "Bandra Kurla Complex", lat: 19.066, lng: 72.8656 },
  },
  {
    names: ["bengaluru", "bangalore"],
    airport: { name: "Kempegowda Intl (BLR)", lat: 13.1986, lng: 77.7066 },
    business: { name: "MG Road", lat: 12.9756, lng: 77.605 },
  },
  {
    names: ["gurugram", "gurgaon"],
    airport: { name: "Indira Gandhi Intl (DEL)", lat: 28.5562, lng: 77.1 },
    business: { name: "DLF Cyber City", lat: 28.495, lng: 77.0895 },
  },
  {
    names: ["noida"],
    airport: { name: "Indira Gandhi Intl (DEL)", lat: 28.5562, lng: 77.1 },
    business: { name: "Sector 62, Noida", lat: 28.627, lng: 77.3727 },
  },
  {
    names: ["delhi", "new delhi"],
    airport: { name: "Indira Gandhi Intl (DEL)", lat: 28.5562, lng: 77.1 },
    business: { name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  },
  {
    names: ["hyderabad"],
    airport: { name: "Rajiv Gandhi Intl (HYD)", lat: 17.2403, lng: 78.4294 },
    business: { name: "HITEC City", lat: 17.4474, lng: 78.3762 },
  },
  {
    names: ["chennai"],
    airport: { name: "Chennai Intl (MAA)", lat: 12.9941, lng: 80.1709 },
    business: { name: "Guindy", lat: 13.0067, lng: 80.2206 },
  },
  {
    names: ["kolkata", "calcutta"],
    airport: { name: "Netaji Subhas Chandra Bose Intl (CCU)", lat: 22.6547, lng: 88.4467 },
    business: { name: "Salt Lake Sector V", lat: 22.5726, lng: 88.4339 },
  },
  {
    names: ["pune"],
    airport: { name: "Pune Airport (PNQ)", lat: 18.5821, lng: 73.9197 },
    business: { name: "Hinjewadi IT Park", lat: 18.5913, lng: 73.7389 },
  },
  {
    names: ["mysuru", "mysore"],
    airport: { name: "Mysuru Airport (MYQ)", lat: 12.2308, lng: 76.6558 },
    business: { name: "Hebbal Industrial Area", lat: 12.3505, lng: 76.6131 },
  },
  {
    names: ["ahmedabad"],
    airport: { name: "Sardar Vallabhbhai Patel Intl (AMD)", lat: 23.0772, lng: 72.6347 },
    business: { name: "SG Highway", lat: 23.0301, lng: 72.5074 },
  },
  {
    names: ["kochi", "cochin"],
    airport: { name: "Cochin Intl (COK)", lat: 10.152, lng: 76.4019 },
    business: { name: "Infopark, Kakkanad", lat: 10.0103, lng: 76.3627 },
  },
  {
    names: ["jaipur"],
    airport: { name: "Jaipur Intl (JAI)", lat: 26.8242, lng: 75.8122 },
    business: { name: "C-Scheme", lat: 26.9054, lng: 75.8007 },
  },
  {
    names: ["indore"],
    airport: { name: "Devi Ahilyabai Holkar Airport (IDR)", lat: 22.7218, lng: 75.8011 },
    business: { name: "Vijay Nagar", lat: 22.7533, lng: 75.8937 },
  },
];

function findCity(city: string): CityGeo | undefined {
  const lower = city.trim().toLowerCase();
  if (!lower) return undefined;
  return CITY_GEO.find((c) => c.names.some((name) => lower.includes(name)));
}

/**
 * Map pins for a newly requested trip: the city's airport, its business district
 * as the meeting area, and a hotel placeholder nearby. Returns no places for a
 * city we have no coordinates for, so the map shows "No locations yet" rather
 * than pins in the wrong city.
 */
export function placesForCity(city: string, meetingVenue: string): Place[] {
  const geo = findCity(city);
  if (!geo) return [];
  return [
    {
      id: "meeting",
      kind: "meeting",
      name: meetingVenue.trim() || geo.business.name,
      lat: geo.business.lat,
      lng: geo.business.lng,
      detail: `${geo.business.name}, ${city.trim()} · exact pin confirmed at booking`,
    },
    {
      id: "hotel",
      kind: "hotel",
      name: "Hotel to be selected",
      lat: geo.business.lat + 0.008,
      lng: geo.business.lng + 0.006,
      detail: `Shortlist near ${geo.business.name}`,
    },
    {
      id: "airport",
      kind: "airport",
      name: geo.airport.name,
      lat: geo.airport.lat,
      lng: geo.airport.lng,
    },
  ];
}
