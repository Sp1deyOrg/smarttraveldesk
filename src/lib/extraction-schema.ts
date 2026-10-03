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
