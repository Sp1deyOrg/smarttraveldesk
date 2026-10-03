import { findPlace } from "./trip-utils";
import type { Trip } from "./types";

/** Saves text as a file through the browser's normal download flow. */
export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const icsDate = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 asks for lines of at most 75 octets; fold well below that to allow multi-byte text. */
function icsFold(line: string) {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 60) parts.push(line.slice(i, i + 60));
  return parts.join("\r\n ");
}

/** An iCalendar file with one event spanning the trip, listing every booking and a day-before reminder. */
export function buildIcs(trip: Trip) {
  const venue = findPlace(trip, "meeting");
  const description = [
    trip.purpose,
    "",
    ...trip.bookings.map((b) => `${b.title} · ${b.detail} · ${b.ref}`),
  ].join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TravelFlow//Trip//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${trip.id}@travelflow`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(trip.startDate)}`,
    `DTEND:${icsDate(trip.endDate)}`,
    `SUMMARY:${icsText(trip.title)}`,
    `LOCATION:${icsText(venue ? `${venue.name}, ${trip.city}` : trip.city)}`,
    `DESCRIPTION:${icsText(description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(`${trip.title} starts tomorrow`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BOOKING_LABEL: Record<Trip["bookings"][number]["type"], string> = {
  flight: "Flight",
  hotel: "Hotel",
  cab: "Cab transfer",
};

/** A self-contained, print-friendly page with every confirmed booking and its reference. */
export function buildTicketsHtml(trip: Trip, traveller: string) {
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const cards = trip.bookings
    .map(
      (b) => `<section class="card">
  <p class="kind">${escapeHtml(BOOKING_LABEL[b.type])} · ${escapeHtml(b.status)}</p>
  <h2>${escapeHtml(b.title)}</h2>
  <p>${escapeHtml(b.detail)}</p>
  <p class="ref">Confirmation <strong>${escapeHtml(b.ref)}</strong></p>
</section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(trip.title)} · tickets</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #1a1d24; }
  h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
  .meta { color: #5b6270; margin: 0 0 1.5rem; }
  .card { border: 1px solid #d8dce3; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; break-inside: avoid; }
  .card h2 { margin: .25rem 0; font-size: 1.1rem; }
  .card p { margin: .25rem 0; }
  .kind { font-size: .75rem; font-weight: 700; text-transform: uppercase; color: #5b6270; }
  .ref { margin-top: .75rem; }
</style>
</head>
<body>
<h1>${escapeHtml(trip.title)}</h1>
<p class="meta">${escapeHtml(traveller)} · ${escapeHtml(trip.originCity)} to ${escapeHtml(trip.city)} · ${escapeHtml(day(trip.startDate))} – ${escapeHtml(day(trip.endDate))} · Trip ${escapeHtml(trip.id)}</p>
${cards}
</body>
</html>
`;
}
