import { STAGES, type Place, type Stage, type Trip } from "./types";
import { distanceKm } from "./geo";

export const stageIndex = (s: Stage) => STAGES.findIndex((x) => x.id === s);

export function stageProgress(s: Stage) {
  return ((stageIndex(s) + 1) / STAGES.length) * 100;
}

export function hoursToDeparture(trip: Trip, now = Date.now()) {
  return (new Date(trip.startDate).getTime() - now) / 3_600_000;
}

export function currentTrip(trips: Trip[], now = Date.now()) {
  return (
    trips.find((t) => t.stage === "live" && new Date(t.endDate).getTime() > now) ??
    trips
      .filter((t) => hoursToDeparture(t, now) > 0)
      .sort((a, b) => hoursToDeparture(a, now) - hoursToDeparture(b, now))[0] ??
    trips[0]
  );
}

export function findPlace(trip: Trip, kind: Place["kind"]) {
  return trip.places.find((p) => p.kind === kind);
}

export function tripDistances(trip: Trip) {
  const airport = findPlace(trip, "airport");
  const hotel = findPlace(trip, "hotel");
  const meeting = findPlace(trip, "meeting");
  const out: { label: string; value: string }[] = [];
  if (airport && hotel)
    out.push({ label: airport.name, value: `${distanceKm(airport, hotel)} km from hotel` });
  if (hotel && meeting)
    out.push({ label: hotel.name, value: `${distanceKm(hotel, meeting)} km from meeting venue` });
  if (airport && meeting)
    out.push({ label: meeting.name, value: `${distanceKm(airport, meeting)} km from airport` });
  trip.places
    .filter((p) => p.kind === "restaurant")
    .forEach((r) => {
      if (hotel) out.push({ label: r.name, value: `${distanceKm(r, hotel)} km from hotel` });
    });
  return out;
}

export function formatDateRange(trip: Trip) {
  const f = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${f(trip.startDate)} – ${f(trip.endDate)}`;
}

export interface TimedAction {
  id: string;
  title: string;
  detail: string;
  cta: string;
}

/** Time-windowed quick actions for a trip. */
export function timedActions(trip: Trip, now = Date.now()): TimedAction[] {
  const h = hoursToDeparture(trip, now);
  const out: TimedAction[] = [];
  if (h <= 48 && h > 1)
    out.push({
      id: "checkin",
      title: "Web check-in open",
      detail: `${trip.city} flight · closes 1 hour before departure`,
      cta: "Check in",
    });
  if (h <= 24 && h > -2)
    out.push({
      id: "docs",
      title: "Document checklist",
      detail: "ID card, client NDA, laptop charger, forex card",
      cta: "Review list",
    });
  if (h <= 24 && h > -6)
    out.push({
      id: "early",
      title: "Request early hotel check-in",
      detail: `Arrival before noon at ${findPlace(trip, "hotel")?.name ?? "your hotel"}`,
      cta: "Request",
    });
  return out;
}
