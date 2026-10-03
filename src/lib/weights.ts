import type { Weights } from "./types";

/** Smallest share any of time, comfort or cost can take on the split bar. */
export const MIN_SEGMENT = 10;

export const DEFAULT_WEIGHTS: Weights = { time: 40, comfort: 25, cost: 35 };

export type Divider = "time" | "cost";

/**
 * Move one divider of the split bar to `position` (0–100). The time divider
 * sits between time and comfort; the cost divider between comfort and cost.
 * The result always totals exactly 100 with every part >= MIN_SEGMENT.
 */
export function moveDivider(value: Weights, divider: Divider, position: number): Weights {
  if (divider === "time") {
    const time = Math.max(MIN_SEGMENT, Math.min(100 - value.cost - MIN_SEGMENT, position));
    return { time, comfort: 100 - time - value.cost, cost: value.cost };
  }
  const boundary = Math.max(value.time + MIN_SEGMENT, Math.min(100 - MIN_SEGMENT, position));
  return { time: value.time, comfort: boundary - value.time, cost: 100 - boundary };
}

/**
 * Turn any three numbers (e.g. from an LLM) into whole-number weights that
 * total exactly 100, each at least MIN_SEGMENT. Scales proportionally with
 * largest-remainder rounding, then tops up any part below the minimum from
 * the largest part. Valid weights come back unchanged.
 */
export function normaliseWeights(raw: Weights): Weights {
  const keys = ["time", "comfort", "cost"] as const;
  const clean = keys.map((k) => (Number.isFinite(raw[k]) && raw[k] > 0 ? raw[k] : 0));
  const total = clean.reduce((sum, n) => sum + n, 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };

  const exact = clean.map((n) => (n / total) * 100);
  const parts = exact.map(Math.floor);
  let remainder = 100 - parts.reduce((sum, n) => sum + n, 0);
  const byFraction = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byFraction) {
    if (remainder <= 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    remainder -= 1;
  }

  for (let i = 0; i < parts.length; i++) {
    while ((parts[i] ?? 0) < MIN_SEGMENT) {
      const largest = parts.indexOf(Math.max(...parts));
      parts[largest] = (parts[largest] ?? 0) - 1;
      parts[i] = (parts[i] ?? 0) + 1;
    }
  }
  return { time: parts[0] ?? 0, comfort: parts[1] ?? 0, cost: parts[2] ?? 0 };
}
