import { NoObjectGeneratedError } from "ai";

import type { AgentModelId } from "./models";
import {
  ProviderError,
  ProviderRefusedError,
  resolveModel,
  type DataClass,
  type ProviderName,
  type ResolvedModel,
} from "./providers";

/** Abort an LLM call that runs longer than the UI is willing to wait. */
const timeoutMs = Number(process.env["LLM_TIMEOUT_MS"]);
export const LLM_TIMEOUT_MS = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20_000;

export type LlmCall = ResolvedModel & { abortSignal: AbortSignal };

/**
 * The only way an agent reaches a model. It picks the provider from
 * LLM_PROVIDER, applies the data-class gate, times the call out and writes one
 * log line without the prompt, the reply or any key.
 *
 * A refusal or a bad configuration is rethrown as it is, because its message is
 * ours. Any other failure is rethrown as a reason code only: an upstream error
 * message can echo part of a key or of the request, and this error can reach
 * the browser.
 */
export async function runLlm<T>(
  agent: AgentModelId,
  dataClass: DataClass,
  call: (llm: LlmCall) => Promise<T>,
): Promise<{ value: T; provider: ProviderName }> {
  const started = Date.now();
  let resolved: ResolvedModel | undefined;
  try {
    resolved = resolveModel(agent, dataClass);
    const value = await call({ ...resolved, abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS) });
    logCall("INFO", { agent, dataClass, resolved, outcome: "ok", started });
    return { value, provider: resolved.provider };
  } catch (error) {
    const reason = failureReason(error);
    const outcome = error instanceof ProviderRefusedError ? "refused" : "error";
    logCall("WARNING", { agent, dataClass, resolved, error, outcome, reason, started });
    if (error instanceof ProviderError) throw error;
    throw new Error(`LLM call failed: ${reason}`, { cause: error });
  }
}

/** A short code for why a call failed. Safe to log and to show. */
export function failureReason(error: unknown): string {
  if (error instanceof ProviderError) return error.code;
  const status = httpStatus(error);
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 404) return "model_unavailable";
  if (status === 429) return "rate_limited";
  if (status !== undefined && status >= 500) return "provider_error";
  if (NoObjectGeneratedError.isInstance(error)) return "invalid_output";
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/credentials|Could not load the default/i.test(text)) return "not_configured";
  if (/abort|timeout/i.test(text)) return "timeout";
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(text)) return "rate_limited";
  if (/404|NOT_FOUND|not found/i.test(text)) return "model_unavailable";
  return "error";
}

/** The SDK wraps a retried failure in a RetryError that carries the last attempt. */
function httpStatus(error: unknown): number | undefined {
  const { statusCode, lastError } = (error ?? {}) as { statusCode?: unknown; lastError?: unknown };
  if (typeof statusCode === "number") return statusCode;
  return lastError ? httpStatus(lastError) : undefined;
}

/**
 * One line of JSON per call, which Cloud Logging reads as a structured entry.
 * It records who was called, with what class of data, and how it went. Never
 * the prompt, the reply or a key.
 */
function logCall(
  severity: "INFO" | "WARNING",
  entry: {
    agent: AgentModelId;
    dataClass: DataClass;
    resolved: ResolvedModel | undefined;
    outcome: "ok" | "refused" | "error";
    reason?: string;
    error?: unknown;
    started: number;
  },
): void {
  const { resolved, error } = entry;
  const line = JSON.stringify({
    severity,
    message: "llm_call",
    agent: entry.agent,
    dataClass: entry.dataClass,
    provider: resolved?.provider ?? (error instanceof ProviderError ? error.provider : undefined),
    model: resolved?.modelId,
    outcome: entry.outcome,
    reason: entry.reason,
    status: httpStatus(error),
    ms: Date.now() - entry.started,
  });
  if (severity === "INFO") console.log(line);
  else console.warn(line);
}
