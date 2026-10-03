import type { ItineraryOption, Preferences, Weights } from "./types";

export interface GradePolicy {
  grade: string;
  label: string;
  metroCap: number;
  otherCap: number;
  economyUnderHrs: number;
  cab: string;
}

/** Default grade-wise policy. Travel Desk edits produce a new array; this one is never mutated. */
export const DEFAULT_GRADES: readonly GradePolicy[] = Object.freeze([
  {
    grade: "L3",
    label: "Senior Associate",
    metroCap: 6000,
    otherCap: 4500,
    economyUnderHrs: 6,
    cab: "Sedan",
  },
  {
    grade: "L4",
    label: "Manager",
    metroCap: 8000,
    otherCap: 6000,
    economyUnderHrs: 3,
    cab: "Sedan",
  },
  {
    grade: "L5",
    label: "Senior Manager",
    metroCap: 11000,
    otherCap: 8500,
    economyUnderHrs: 2,
    cab: "Sedan or SUV",
  },
  {
    grade: "L6",
    label: "Director",
    metroCap: 15000,
    otherCap: 11000,
    economyUnderHrs: 0,
    cab: "Premium sedan",
  },
]);

export const TRAVELLER_GRADE = "L4";

export function gradePolicy(grades: readonly GradePolicy[], grade: string): GradePolicy {
  return grades.find((p) => p.grade === grade) ?? (DEFAULT_GRADES[1] as GradePolicy);
}

export function hotelCap(policy: GradePolicy, tier: "metro" | "other"): number {
  return tier === "metro" ? policy.metroCap : policy.otherCap;
}

export function policyViolations(
  option: ItineraryOption,
  tier: "metro" | "other",
  policy: GradePolicy,
): string[] {
  const out: string[] = [...option.violations];
  const cap = hotelCap(policy, tier);
  if (option.hotelNightlyINR > cap) {
    out.push(
      `Hotel is ${Math.round(((option.hotelNightlyINR - cap) / cap) * 100)}% above the ₹${cap.toLocaleString("en-IN")} per-night cap for your grade`,
    );
  }
  const econHrs = policy.economyUnderHrs;
  if (/business/i.test(option.flight) && option.doorToDoorMins < econHrs * 60) {
    out.push(
      `Business class is not allowed on flights under ${econHrs} hours at grade ${policy.grade}`,
    );
  }
  const allowsSuv = /SUV|premium/i.test(policy.cab);
  const allowsPremium = /premium/i.test(policy.cab);
  if ((/SUV/i.test(option.cab) && !allowsSuv) || (/premium/i.test(option.cab) && !allowsPremium)) {
    out.push(`Cab class is above the ${policy.cab.toLowerCase()} limit for grade ${policy.grade}`);
  }
  return Array.from(new Set(out));
}

export function scoreOption(
  option: ItineraryOption,
  all: ItineraryOption[],
  weights: Weights,
  tier: "metro" | "other",
  policy: GradePolicy,
  prefs?: Preferences,
): number {
  const costs = all.map((o) => o.costINR);
  const times = all.map((o) => o.doorToDoorMins);
  const span = (arr: number[]) => Math.max(1, Math.max(...arr) - Math.min(...arr));
  const costScore = 100 - ((option.costINR - Math.min(...costs)) / span(costs)) * 100;
  const timeScore = 100 - ((option.doorToDoorMins - Math.min(...times)) / span(times)) * 100;
  const comfortScore = (option.comfort / 5) * 100;

  let score =
    (weights.cost * costScore + weights.time * timeScore + weights.comfort * comfortScore) / 100;

  const violations = policyViolations(option, tier, policy);
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
  policy: GradePolicy,
  prefs?: Preferences,
) {
  return options
    .map((o) => ({
      option: o,
      score: scoreOption(o, options, weights, tier, policy, prefs),
      violations: policyViolations(o, tier, policy),
    }))
    .sort((a, b) => b.score - a.score);
}
