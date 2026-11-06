import { describe, expect, it } from "vitest";

import { placesForCity } from "@/lib/city-geo";
import { draftOptions } from "@/lib/trip-data";
import { confirmedBookings } from "@/lib/trip-utils";
import type { Booking } from "@/lib/types";
import { makeOption, makeTrip } from "./fixtures";

const pending = (type: Booking["type"]): Booking => ({
  id: `b-${type}`,
  type,
  title: "Agent researching",
  detail: "",
  ref: "Not held",
  status: "Pending",
  alternatives: [],
});

describe("placesForCity", () => {
  it("pins a known city at its own airport and business district", () => {
    const places = placesForCity("Mumbai", "BKC office");
    const airport = places.find((p) => p.kind === "airport");
    const meeting = places.find((p) => p.kind === "meeting");
    expect(airport?.name).toContain("BOM");
    expect(meeting?.name).toBe("BKC office");
    expect(meeting?.lat).toBeCloseTo(19.07, 1);
  });

  it("returns no pins for a city it has no coordinates for", () => {
    expect(placesForCity("Shillong", "Office")).toEqual([]);
  });
});

describe("draftOptions", () => {
  it("uses the metro hotel cap for metro cities", () => {
    const metro = draftOptions("Mumbai", "metro");
    const other = draftOptions("Pune", "other");
    expect(metro.length).toBeGreaterThanOrEqual(3);
    expect(metro.find((o) => o.id === "o1")?.hotelNightlyINR).toBe(7400);
    expect(other.find((o) => o.id === "o1")?.hotelNightlyINR).toBe(5400);
  });
});

describe("confirmedBookings", () => {
  const option = makeOption({
    id: "o1",
    flight: "IndiGo 6E-204 · 06:20 dep · Economy",
    hotel: "Novotel Pune",
    hotelNightlyINR: 5400,
    cab: "Sedan · Dzire",
  });
  const trip = makeTrip({
    options: [option],
    bookings: [pending("flight"), pending("hotel"), pending("cab")],
  });

  it("fills pending bookings from the approved option", () => {
    const [flight, hotel, cab] = confirmedBookings(trip, "o1");
    expect(flight).toMatchObject({ title: "IndiGo 6E-204", status: "Confirmed" });
    expect(flight?.detail).toBe("Bengaluru → Pune · 06:20 dep · Economy");
    expect(flight?.ref).toMatch(/^PNR [0-9A-Z]{6}$/);
    expect(hotel).toMatchObject({ title: "Novotel Pune", detail: "2 nights · ₹5,400 / night" });
    expect(cab).toMatchObject({ title: "Sedan · Dzire", status: "Confirmed" });
  });

  it("leaves bookings alone for an unknown option and keeps confirmed ones", () => {
    expect(confirmedBookings(trip, "nope")).toBe(trip.bookings);
    const done = { ...pending("cab"), status: "Confirmed", ref: "CAB-1" };
    const mixed = makeTrip({ options: [option], bookings: [done] });
    expect(confirmedBookings(mixed, "o1")[0]).toBe(done);
  });
});
