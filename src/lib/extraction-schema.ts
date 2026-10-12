import { z } from "zod";

/** Structured trip brief produced by the Discovery agent (AI) or the rule parser. */
export const Extraction = z.object({
  destinationCity: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  purpose: z.string(),
  meetingVenue: z.string(),
  title: z.string(),
  weightTime: z.number(),
  weightComfort: z.number(),
  weightCost: z.number(),
  notes: z.string(),
  missingFields: z.array(z.string()),
});

export type TripExtraction = z.infer<typeof Extraction>;

/** True when the text starts with a real calendar date written yyyy-mm-dd. */
function startsWithIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Rules a schema cannot state, applied to a brief from any model. A date that
 * is not a real yyyy-mm-dd is blanked and listed in missingFields, so the card
 * highlights it. Left in, it would pass the "required" check and then throw
 * when the trip is created.
 */
export function checkBrief(brief: TripExtraction): TripExtraction {
  const invalid = (["startDate", "endDate"] as const).filter(
    (field) => brief[field] !== "" && !startsWithIsoDate(brief[field]),
  );
  if (invalid.length === 0) return brief;
  const next = { ...brief, missingFields: [...new Set([...brief.missingFields, ...invalid])] };
  for (const field of invalid) next[field] = "";
  return next;
}
