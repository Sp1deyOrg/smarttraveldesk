import { afterEach, describe, expect, it } from "vitest";

import { ruleParse } from "@/lib/rule-parser";

const NOW = new Date(2026, 9, 2, 12, 0, 0); // 2 Oct 2026, local time
const SAMPLE =
  "Client review at Infosys Mysuru campus 14–16 Oct, prefer morning flights, keep it within policy";

describe("ruleParse", () => {
  const originalTz = process.env["TZ"];
  afterEach(() => {
    process.env["TZ"] = originalTz;
  });

  it("extracts the sample request", () => {
    const r = ruleParse(SAMPLE, NOW);
    expect(r.destinationCity).toBe("Mysuru");
    expect(r.startDate).toBe("2026-10-14");
    expect(r.endDate).toBe("2026-10-16");
    expect(r.purpose).toBe("Client review");
    expect(r.meetingVenue).toBe("Infosys Mysuru");
    expect(r.missingFields).toEqual([]);
  });

  it("returns the same calendar dates in India as in UTC", () => {
    process.env["TZ"] = "Asia/Kolkata";
    const ist = ruleParse(SAMPLE, new Date(2026, 9, 2, 12, 0, 0));
    expect(ist.startDate).toBe("2026-10-14");
    expect(ist.endDate).toBe("2026-10-16");
  });

  it("reads a range written with a month on both dates (the PRD example)", () => {
    const r = ruleParse(
      "Client workshop in Pune from 12 Oct to 14 Oct at EON IT Park, prioritise comfort",
      NOW,
    );
    expect(r.destinationCity).toBe("Pune");
    expect(r.startDate).toBe("2026-10-12");
    expect(r.endDate).toBe("2026-10-14");
    expect(r.meetingVenue).toBe("EON IT Park");
  });

  it("reads a range that crosses the year end", () => {
    const r = ruleParse("Audit in Chennai 30 Dec - 2 Jan", NOW);
    expect(r.startDate).toBe("2026-12-30");
    expect(r.endDate).toBe("2027-01-02");
  });

  it("rolls dates that already passed into next year", () => {
    const r = ruleParse("Workshop in Pune 3-4 Jan at EON IT Park", NOW);
    expect(r.startDate).toBe("2027-01-03");
    expect(r.endDate).toBe("2027-01-04");
  });

  it("lists every missing field for a vague request", () => {
    const r = ruleParse("need to travel soon", NOW);
    expect(r.missingFields.sort()).toEqual([
      "destinationCity",
      "endDate",
      "meetingVenue",
      "purpose",
      "startDate",
    ]);
  });

  it("always returns weights that total 100", () => {
    for (const text of [SAMPLE, "cheap fast trip to Delhi", "pitch in Chennai 5 Nov", "nothing"]) {
      const r = ruleParse(text, NOW);
      expect(r.weightTime + r.weightComfort + r.weightCost).toBe(100);
    }
  });
});
