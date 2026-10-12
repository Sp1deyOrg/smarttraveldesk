/**
 * Which Gemini model and region each agent uses on Vertex AI.
 * Model IDs are configurable so a retired or unavailable model can be swapped
 * without a code change (see infra/probe-vertex.sh). The apinex provider uses
 * the single model named in APINEX_MODEL (see providers.ts).
 */
export type AgentModelId = "discovery";

export interface VertexModelConfig {
  model: string;
  location: string;
}

export function vertexModelConfig(
  agent: AgentModelId,
  env: Readonly<Record<string, string | undefined>> = process.env,
): VertexModelConfig {
  // A blank value, as in a copied .env.example, counts as unset.
  const location = env["GOOGLE_VERTEX_LOCATION"]?.trim() || "asia-south1";
  const flash = env["GEMINI_FLASH_MODEL"]?.trim() || "gemini-3.5-flash";
  const registry: Record<AgentModelId, VertexModelConfig> = {
    discovery: { model: flash, location },
  };
  return registry[agent];
}
