import type { TripExtraction } from "./extraction-schema";

const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Bangalore",
  "Hyderabad",
  "Delhi",
  "Gurugram",
  "Noida",
  "Pune",
  "Chennai",
  "Kolkata",
  "Mysuru",
  "Ahmedabad",
  "Kochi",
  "Jaipur",
  "Indore",
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Next occurrence of day/month as a local calendar date (yyyy-mm-dd). */
function toISO(day: number, monthIdx: number, now: Date): string {
  let year = now.getFullYear();
  if (new Date(year, monthIdx, day).getTime() < now.getTime() - 86400000) year += 1;
  // Format the local date parts: toISOString() would shift to UTC and give the
  // previous day for anyone east of Greenwich (e.g. IST).
  return `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
}

/** Offline fallback used when the AI extraction is unavailable. */
export function ruleParse(text: string, now: Date = new Date()): TripExtraction {
  const lower = text.toLowerCase();
  const city = CITIES.find((c) => lower.includes(c.toLowerCase())) ?? "";

  let startDate = "";
  let endDate = "";
  const monthIdx = MONTHS.findIndex((m) => lower.includes(m));
  const month = `(${MONTHS.join("|")})[a-z]*`;
  const fullRange = lower.match(
    new RegExp(
      `(\\d{1,2})(?:st|nd|rd|th)?\\s+${month}\\s*(?:–|-|to|until|till)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${month}`,
    ),
  );
  const range = text.match(/(\d{1,2})\s*(?:–|-|to)\s*(\d{1,2})/);
  const single = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+[A-Za-z]{3,}/);
  if (fullRange) {
    // "12 Oct to 14 Oct", "30 Dec - 2 Jan"
    startDate = toISO(Number(fullRange[1]), MONTHS.indexOf(fullRange[2] ?? ""), now);
    endDate = toISO(Number(fullRange[3]), MONTHS.indexOf(fullRange[4] ?? ""), now);
  } else if (monthIdx >= 0 && range) {
    startDate = toISO(Number(range[1]), monthIdx, now);
    endDate = toISO(Number(range[2]), monthIdx, now);
  } else if (monthIdx >= 0 && single) {
    startDate = toISO(Number(single[1]), monthIdx, now);
    endDate = startDate;
  }

  const venueMatch = text.match(/at\s+([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,4})/);
  const venue = venueMatch?.[1]?.trim() ?? "";

  const purposeWord =
    [
      "client review",
      "review",
      "workshop",
      "pitch",
      "audit",
      "summit",
      "negotiation",
      "training",
      "kickoff",
    ].find((p) => lower.includes(p)) ?? "";

  let weightTime = 40;
  let weightComfort = 25;
  let weightCost = 35;
  if (/cheap|budget|cost|within policy|save/.test(lower)) {
    weightCost = 50;
    weightTime = 30;
    weightComfort = 20;
  }
  if (/morning|earliest|quick|fast|same day/.test(lower)) {
    weightTime = Math.min(60, weightTime + 15);
    weightCost = 100 - weightTime - weightComfort;
  }

  const missing: string[] = [];
  if (!city) missing.push("destinationCity");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!purposeWord) missing.push("purpose");
  if (!venue) missing.push("meetingVenue");

  return {
    destinationCity: city,
    startDate,
    endDate,
    purpose: purposeWord ? purposeWord.replace(/^\w/, (c) => c.toUpperCase()) : "",
    meetingVenue: venue,
    title: city
      ? `${purposeWord ? purposeWord.replace(/^\w/, (c) => c.toUpperCase()) : "Business trip"} — ${city}`
      : "",
    weightTime,
    weightComfort,
    weightCost,
    notes: "Parsed offline with keyword rules.",
    missingFields: missing,
  };
}
