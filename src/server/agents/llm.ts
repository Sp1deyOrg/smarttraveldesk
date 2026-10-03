import { createVertex } from "@ai-sdk/google-vertex";

import { AGENT_MODELS, type AgentModelId } from "./models";

/**
 * Gemini on Vertex AI. On Cloud Run the attached service account provides
 * credentials through Application Default Credentials, so no key file is used.
 */
export function agentModel(agent: AgentModelId) {
  const { model, location } = AGENT_MODELS[agent];
  const project = process.env["GOOGLE_VERTEX_PROJECT"];
  if (!project) throw new Error("GOOGLE_VERTEX_PROJECT is not set");
  return createVertex({ project, location })(model);
}

/** Abort an LLM call that runs longer than the UI is willing to wait. */
export const LLM_TIMEOUT_MS = Number(process.env["LLM_TIMEOUT_MS"] ?? 20_000);
