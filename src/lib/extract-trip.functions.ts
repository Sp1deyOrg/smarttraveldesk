import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

const Extraction = z.object({
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

export const extractTrip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ text: z.string().min(3) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const today = new Date().toISOString().slice(0, 10);

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: Extraction }),
      system: [
        "You extract structured corporate travel requests for a single employee of a large Indian company.",
        `Today is ${today}. Resolve relative or partial dates to ISO yyyy-mm-dd in the current or next year so they are in the future.`,
        "The traveller is based in Bengaluru, grade L4 (Manager).",
        "weightTime, weightComfort and weightCost are integers that must sum to exactly 100, inferred from the request (default 40/25/35).",
        "Leave a field as an empty string when the request does not state it, and list that field name in missingFields. Never invent a city, date or venue.",
        "title is a short trip title like 'Client review — Mysuru'. notes is one short sentence about what you assumed.",
      ].join(" "),
      prompt: data.text,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", store: false },
      },
    });

    return await result.output;
  });
