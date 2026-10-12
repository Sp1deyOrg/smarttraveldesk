import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { buildSystem } from "@/server/agents/discovery-prompt";
import { runLlm } from "@/server/agents/llm";
import { redactForThirdParty } from "@/server/agents/redact";
import { checkBrief, Extraction, type TripExtraction } from "./extraction-schema";
import { normaliseWeights } from "./weights";

export type { TripExtraction };

/**
 * Discovery agent: turn a plain-English trip request into a structured brief.
 * Returns the brief and the provider that produced it. The client falls back to
 * the rule parser when this throws.
 */
export const extractTrip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ text: z.string().min(3).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);

    // The employee typed this text, so it is the employee_text class: a
    // third-party provider takes it only while the owner's dated allowance runs.
    const { value: output, provider } = await runLlm("discovery", "employee_text", async (llm) => {
      const text = llm.thirdParty ? redactForThirdParty(data.text).text : data.text;
      const result = await generateText({
        model: llm.model,
        output: Output.object({ schema: Extraction }),
        system: buildSystem(today, llm.enforcesSchema),
        prompt: `<request>\n${text}\n</request>`,
        abortSignal: llm.abortSignal,
        ...(llm.providerOptions ? { providerOptions: llm.providerOptions } : {}),
      });
      return result.output;
    });

    // The SDK has already validated the shape. These are the rules a schema cannot state,
    // applied whichever provider answered.
    const checked = checkBrief(output);
    // The split bar needs whole numbers totalling exactly 100.
    const weights = normaliseWeights({
      time: checked.weightTime,
      comfort: checked.weightComfort,
      cost: checked.weightCost,
    });
    const brief: TripExtraction = {
      ...checked,
      weightTime: weights.time,
      weightComfort: weights.comfort,
      weightCost: weights.cost,
    };
    return { brief, provider };
  });
