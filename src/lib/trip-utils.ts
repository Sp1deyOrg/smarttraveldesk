import { STAGES, type Booking, type Place, type Stage, type Trip } from "./types";
import { distanceKm, formatINR } from "./geo";

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

/** Items the traveller ticks off before leaving; also summarised on the quick-action card. */
export const DOCUMENT_CHECKLIST = ["ID card", "Client NDA", "Laptop charger", "Forex card"];

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
      detail: DOCUMENT_CHECKLIST.join(", "),
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

export interface DateWindow {
  startDate: string;
  endDate: string;
  label: string;
}

/** The same trip shifted by whole weeks, so meeting weekdays line up with the original plan. */
export function alternativeWindows(trip: Trip, weeks = [1, 2, 3]): DateWindow[] {
  const shift = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  return weeks.map((w) => {
    const startDate = shift(trip.startDate, w * 7);
    const endDate = shift(trip.endDate, w * 7);
    return { startDate, endDate, label: formatDateRange({ ...trip, startDate, endDate }) };
  });
}

/**
 * Bookings after a person approves an itinerary option, so the Confirmed stage
 * shows the chosen flight, hotel and cab with references instead of the
 * "Pending" placeholders. Bookings that are already confirmed are kept.
 */
export function confirmedBookings(trip: Trip, optionId: string): Booking[] {
  const option = trip.options.find((o) => o.id === optionId);
  if (!option) return trip.bookings;
  const seed = Number(trip.id.replace(/\D/g, "")) || 1;
  // Always six base-36 characters: 36^5 + (hash mod (36^6 - 36^5)).
  const code = (n: number) =>
    (60_466_176 + ((seed * 7919 + n * 104_729) % 2_116_316_160)).toString(36).toUpperCase();
  const day = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const nights = Math.max(1, Math.round((day(trip.endDate) - day(trip.startDate)) / 86_400_000));
  const [flightName = option.flight, ...flightRest] = option.flight.split(" · ");
  const confirmed: Record<Booking["type"], Pick<Booking, "title" | "detail" | "ref">> = {
    flight: {
      title: flightName,
      detail: [`${trip.originCity} → ${trip.city}`, ...flightRest].join(" · "),
      ref: `PNR ${code(1)}`,
    },
    hotel: option.hotelNightlyINR
      ? {
          title: option.hotel,
          detail: `${nights} night${nights === 1 ? "" : "s"} · ${formatINR(option.hotelNightlyINR)} / night`,
          ref: `HTL-${code(2).slice(-5)}`,
        }
      : { title: option.hotel, detail: "Same-day return", ref: "Not needed" },
    cab: {
      title: option.cab,
      detail: "Airport → hotel · pickup aligned to arrival",
      ref: `CAB-${code(3).slice(-5)}`,
    },
  };
  return trip.bookings.map((b) =>
    b.status === "Confirmed" ? b : { ...b, ...confirmed[b.type], status: "Confirmed" },
  );
}
