import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRADES,
  gradePolicy,
  policyViolations,
  rankOptions,
  scoreOption,
  type GradePolicy,
} from "@/lib/policy";
import { TRIPS } from "@/lib/trip-data";
import { makeOption, NO_PREFS } from "./fixtures";

const L4 = gradePolicy(DEFAULT_GRADES, "L4");
const W = { time: 40, comfort: 25, cost: 35 };

describe("policyViolations", () => {
  it("passes a compliant option", () => {
    expect(policyViolations(makeOption(), "other", L4)).toEqual([]);
  });

  it("flags a hotel above the cap with the % over", () => {
    expect(policyViolations(makeOption({ hotelNightlyINR: 9600 }), "metro", L4)).toEqual([
      "Hotel is 20% above the ₹8,000 per-night cap for your grade",
    ]);
  });

  it("flags business class on short flights and premium cabs, naming the grade", () => {
    const v = policyViolations(
      makeOption({ flight: "Air India Business", doorToDoorMins: 120, cab: "Premium SUV" }),
      "other",
      L4,
    );
    expect(v).toEqual([
      "Business class is not allowed on flights under 3 hours at grade L4",
      "Cab class is above the sedan limit for grade L4",
    ]);
  });

  it("uses the grade passed in, not a global", () => {
    const l5 = gradePolicy(DEFAULT_GRADES, "L5");
    expect(policyViolations(makeOption({ cab: "SUV" }), "other", l5)).toEqual([]);
    const tighter: GradePolicy = { ...L4, metroCap: 7000 };
    expect(policyViolations(makeOption({ hotelNightlyINR: 7500 }), "metro", tighter)).toHaveLength(
      1,
    );
    expect(policyViolations(makeOption({ hotelNightlyINR: 7500 }), "metro", L4)).toHaveLength(0);
  });

  it("keeps seeded violations and removes duplicates", () => {
    const o = makeOption({ violations: ["Booked late", "Booked late"] });
    expect(policyViolations(o, "other", L4)).toEqual(["Booked late"]);
  });

  it("never mutates the default grades", () => {
    expect(Object.isFrozen(DEFAULT_GRADES)).toBe(true);
  });
});

describe("scoreOption", () => {
  const cheap = makeOption({ id: "cheap", costINR: 10000, doorToDoorMins: 400, comfort: 2 });
  const fast = makeOption({ id: "fast", costINR: 30000, doorToDoorMins: 200, comfort: 5 });
  const all = [cheap, fast];

  it("scores cost and time relative to the other options", () => {
    // cheap: cost 100, time 0, comfort 40 -> (35*100 + 40*0 + 25*40) / 100 = 45
    expect(scoreOption(cheap, all, W, "other", L4)).toBe(45);
    // fast: cost 0, time 100, comfort 100 -> (0 + 4000 + 2500) / 100 = 65
    expect(scoreOption(fast, all, W, "other", L4)).toBe(65);
  });

  it("subtracts 12 per violation and never goes below 0", () => {
    const pricey = makeOption({ ...fast, id: "pricey", hotelNightlyINR: 20000 });
    expect(scoreOption(pricey, [cheap, pricey], W, "other", L4)).toBe(65 - 12);
    const awful = makeOption({
      comfort: 1,
      violations: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    });
    expect(scoreOption(awful, [awful], W, "other", L4)).toBe(0);
  });

  it("adds preference bonuses (+5 airline, +5 hotel chain, +4 morning)", () => {
    const base = scoreOption(fast, all, W, "other", L4, NO_PREFS);
    const prefs = {
      ...NO_PREFS,
      airlines: ["IndiGo"],
      hotelChains: ["Lemon Tree"],
      timeOfDay: "Morning",
    };
    expect(scoreOption(fast, all, W, "other", L4, prefs)).toBe(base + 14);
  });
});

describe("rankOptions on seeded trip TRV-2503", () => {
  it("matches the scores the app shows today", () => {
    const trip = TRIPS.find((t) => t.id === "TRV-2503");
    if (!trip) throw new Error("seed trip missing");
    const ranked = rankOptions(trip.options, trip.weights, trip.cityTier, L4, NO_PREFS);
    expect(ranked.map((r) => `${r.option.id}:${r.score}`)).toMatchInlineSnapshot(`
      [
        "o1:85",
        "o4:45",
        "o2:42",
        "o3:35",
      ]
    `);
  });
});
