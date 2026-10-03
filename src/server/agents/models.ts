/**
 * Model registry: which Gemini model and region each agent uses.
 * Model IDs are configurable so a retired or unavailable model can be swapped
 * without a code change (see infra/probe-vertex.sh).
 */
export type AgentModelId = "discovery";

export interface AgentModelConfig {
  model: string;
  location: string;
}

const location = process.env["GOOGLE_VERTEX_LOCATION"] ?? "asia-south1";
const flash = process.env["GEMINI_FLASH_MODEL"] ?? "gemini-3.5-flash";

export const AGENT_MODELS: Record<AgentModelId, AgentModelConfig> = {
  discovery: { model: flash, location },
};
