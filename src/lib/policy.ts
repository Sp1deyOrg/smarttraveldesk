import type { ItineraryOption, Preferences, Trip, Weights } from "./types";

export const POLICY = {
  grade: "L4 (Manager)",
  rules: [
    "Economy class for flights under 3 hours",
    "Hotel cap ₹8,000 / night in metro cities",
    "Hotel cap ₹6,000 / night in non-metro cities",
    "Sedan category cabs (no premium / SUV)",
    "Bookings at least 5 days before departure",
  ],
  hotelCap: (tier: "metro" | "other") => (tier === "metro" ? 8000 : 6000),
};

export function policyViolations(
  option: ItineraryOption,
  tier: "metro" | "other",
): string[] {
  const out: string[] = [...option.violations];
  const cap = POLICY.hotelCap(tier);
  if (option.hotelNightlyINR > cap) {
    out.push(
      `Hotel is ${Math.round(((option.hotelNightlyINR - cap) / cap) * 100)}% above the ₹${cap.toLocaleString("en-IN")} per-night cap for your grade`,
    );
  }
  if (/business/i.test(option.flight) && option.doorToDoorMins < 180) {
    out.push("Business class is not allowed on flights under 3 hours at grade L4");
  }
  if (/SUV|premium/i.test(option.cab)) {
    out.push("Cab class is above the sedan limit for grade L4");
  }
  return Array.from(new Set(out));
}

export function normaliseWeights(w: Weights): Weights {
  const total = w.time + w.comfort + w.cost || 1;
  return {
    time: Math.round((w.time / total) * 100),
    comfort: Math.round((w.comfort / total) * 100),
    cost: Math.round((w.cost / total) * 100),
  };
}

/** Rebalance so the three sliders always total 100. */
export function rebalance(w: Weights, changed: keyof Weights, value: number): Weights {
  const keys = (["time", "comfort", "cost"] as const).filter((k) => k !== changed);
  const a = keys[0] as keyof Weights;
  const b = keys[1] as keyof Weights;
  const remaining = 100 - value;
  const otherTotal = w[a] + w[b];
  const next: Weights = { ...w, [changed]: value };
  if (otherTotal === 0) {
    next[a] = Math.round(remaining / 2);
    next[b] = remaining - next[a];
  } else {
    next[a] = Math.round((w[a] / otherTotal) * remaining);
    next[b] = remaining - next[a];
  }
  return next;
}

export function scoreOption(
  option: ItineraryOption,
  all: ItineraryOption[],
  weights: Weights,
  tier: "metro" | "other",
  prefs?: Preferences,
): number {
  const costs = all.map((o) => o.costINR);
  const times = all.map((o) => o.doorToDoorMins);
  const span = (arr: number[]) => Math.max(1, Math.max(...arr) - Math.min(...arr));
  const costScore = 100 - ((option.costINR - Math.min(...costs)) / span(costs)) * 100;
  const timeScore = 100 - ((option.doorToDoorMins - Math.min(...times)) / span(times)) * 100;
  const comfortScore = (option.comfort / 5) * 100;

  let score =
    (weights.cost * costScore + weights.time * timeScore + weights.comfort * comfortScore) /
    100;

  const violations = policyViolations(option, tier);
  score -= violations.length * 12;

  if (prefs) {
    if (prefs.airlines.some((a) => option.flight.toLowerCase().includes(a.toLowerCase())))
      score += 5;
    if (prefs.hotelChains.some((h) => option.hotel.toLowerCase().includes(h.toLowerCase())))
      score += 5;
    if (prefs.timeOfDay === "Morning" && /0[5-9]:|1[01]:/.test(option.flight)) score += 4;
  }
  return Math.max(0, Math.round(score));
}

export function rankOptions(
  options: ItineraryOption[],
  weights: Weights,
  tier: "metro" | "other",
  prefs?: Preferences,
) {
  return options
    .map((o) => ({
      option: o,
      score: scoreOption(o, options, weights, tier, prefs),
      violations: policyViolations(o, tier),
    }))
    .sort((a, b) => b.score - a.score);
}
