import { describe, expect, it } from "vitest";

import { currentTrip, stageProgress, timedActions, tripDistances } from "@/lib/trip-utils";
import { makeTrip } from "./fixtures";

const DEPART = Date.parse("2026-10-14T08:00:00.000Z");
const hoursBefore = (h: number) => DEPART - h * 3_600_000;
const ids = (h: number) => timedActions(makeTrip(), hoursBefore(h)).map((a) => a.id);

describe("timedActions", () => {
  it("opens web check-in 48h out and closes it 1h before departure", () => {
    expect(ids(49)).toEqual([]);
    expect(ids(48)).toEqual(["checkin"]);
    expect(ids(1.5)).toContain("checkin");
    expect(ids(1)).not.toContain("checkin");
  });

  it("shows the document checklist and early check-in from 24h out", () => {
    expect(ids(25)).toEqual(["checkin"]);
    expect(ids(24)).toEqual(["checkin", "docs", "early"]);
    expect(ids(-1)).toEqual(["docs", "early"]);
    expect(ids(-3)).toEqual(["early"]);
    expect(ids(-6)).toEqual([]);
  });
});

describe("currentTrip", () => {
  const now = hoursBefore(100);
  it("prefers a live trip that has not ended", () => {
    const live = makeTrip({ id: "live", stage: "live", endDate: "2026-12-01T00:00:00.000Z" });
    const soon = makeTrip({ id: "soon", startDate: new Date(now + 3_600_000).toISOString() });
    expect(currentTrip([soon, live], now)?.id).toBe("live");
  });

  it("otherwise picks the next departure", () => {
    const later = makeTrip({
      id: "later",
      startDate: new Date(now + 48 * 3_600_000).toISOString(),
    });
    const sooner = makeTrip({
      id: "sooner",
      startDate: new Date(now + 2 * 3_600_000).toISOString(),
    });
    const past = makeTrip({ id: "past", startDate: new Date(now - 3_600_000).toISOString() });
    expect(currentTrip([later, past, sooner], now)?.id).toBe("sooner");
  });
});

describe("stageProgress", () => {
  it("runs from 20% in Discovery to 100% in Post-Trip", () => {
    expect(stageProgress("discovery")).toBe(20);
    expect(stageProgress("post")).toBe(100);
  });
});

describe("tripDistances", () => {
  it("reports km between airport, hotel and meeting", () => {
    const trip = makeTrip({
      places: [
        { id: "a", kind: "airport", name: "Pune Airport", lat: 18.5793, lng: 73.9089 },
        { id: "h", kind: "hotel", name: "Hotel", lat: 18.5362, lng: 73.8939 },
        { id: "m", kind: "meeting", name: "EON IT Park", lat: 18.5515, lng: 73.9497 },
      ],
    });
    const rows = tripDistances(trip);
    expect(rows.map((r) => r.label)).toEqual(["Pune Airport", "Hotel", "EON IT Park"]);
    for (const r of rows) expect(r.value).toMatch(/^\d+(\.\d+)? km from /);
  });
});
