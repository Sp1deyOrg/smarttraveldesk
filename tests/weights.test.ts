import { describe, expect, it } from "vitest";

import { MIN_SEGMENT, moveDivider, normaliseWeights } from "@/lib/weights";

const sum = (w: { time: number; comfort: number; cost: number }) => w.time + w.comfort + w.cost;

describe("moveDivider", () => {
  const start = { time: 40, comfort: 25, cost: 35 };

  it("moves the time divider and keeps cost fixed", () => {
    expect(moveDivider(start, "time", 50)).toEqual({ time: 50, comfort: 15, cost: 35 });
  });

  it("moves the cost divider and keeps time fixed", () => {
    expect(moveDivider(start, "cost", 70)).toEqual({ time: 40, comfort: 30, cost: 30 });
  });

  it("never lets a segment drop below the minimum", () => {
    for (const position of [-50, 0, 5, 95, 100, 150]) {
      for (const divider of ["time", "cost"] as const) {
        const next = moveDivider(start, divider, position);
        expect(sum(next)).toBe(100);
        expect(Math.min(next.time, next.comfort, next.cost)).toBeGreaterThanOrEqual(MIN_SEGMENT);
      }
    }
  });
});

describe("normaliseWeights", () => {
  it("leaves valid weights unchanged", () => {
    expect(normaliseWeights({ time: 40, comfort: 25, cost: 35 })).toEqual({
      time: 40,
      comfort: 25,
      cost: 35,
    });
  });

  it("always totals exactly 100 with the minimum per part", () => {
    const cases = [
      { time: 1, comfort: 1, cost: 1 },
      { time: 33.3, comfort: 33.3, cost: 33.3 },
      { time: 90, comfort: 0, cost: 10 },
      { time: 500, comfort: 200, cost: 300 },
      { time: -5, comfort: 50, cost: Number.NaN },
    ];
    for (const raw of cases) {
      const w = normaliseWeights(raw);
      expect(sum(w)).toBe(100);
      expect(Math.min(w.time, w.comfort, w.cost)).toBeGreaterThanOrEqual(MIN_SEGMENT);
      expect([w.time, w.comfort, w.cost].every(Number.isInteger)).toBe(true);
    }
  });

  it("falls back to the default split when nothing is usable", () => {
    expect(normaliseWeights({ time: 0, comfort: 0, cost: 0 })).toEqual({
      time: 40,
      comfort: 25,
      cost: 35,
    });
  });
});
