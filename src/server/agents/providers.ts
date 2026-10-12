import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractJsonMiddleware, wrapLanguageModel, type JSONValue, type LanguageModel } from "ai";

import { vertexModelConfig, type AgentModelId } from "./models";

/**
 * Where LLM calls go. Switch with LLM_PROVIDER and a restart. A call never
 * fails over from one provider to the other, so data cleared for one is not
 * sent to the second because the first had an outage.
 */
export type ProviderName = "vertex" | "apinex";

/**
 * What a call sends to the model. Every call declares one, and checkGate clears
 * each provider per class.
 *  - synthetic: invented text, such as probes and tests.
 *  - employee_text: a request an employee typed into the app.
 *  - employee_records: calendar events, email, receipts and other records of real people.
 */
export type DataClass = "synthetic" | "employee_text" | "employee_records";

type Env = Readonly<Record<string, string | undefined>>;
export type ProviderOptions = Record<string, Record<string, JSONValue>>;

export interface ResolvedModel {
  provider: ProviderName;
  modelId: string;
  model: Exclude<LanguageModel, string>;
  /** The provider enforces the response schema. When false, the prompt must describe the JSON fields. */
  enforcesSchema: boolean;
  /** Prompts leave Google Cloud for a third party, so strip identifiers first. */
  thirdParty: boolean;
  providerOptions?: ProviderOptions;
}

export type ProviderErrorCode =
  | "invalid_setting"
  | "not_configured"
  | "records_never_third_party"
  | "third_party_not_allowed"
  | "third_party_allowance_invalid"
  | "third_party_allowance_expired";

/** Raised before any network call. The message is safe to log and never contains a secret. */
export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly provider?: ProviderName,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** The environment is wrong. Fix it and restart. */
export class ProviderConfigError extends ProviderError {
  override name = "ProviderConfigError";
}

/** The data class is not cleared for this provider. */
export class ProviderRefusedError extends ProviderError {
  override name = "ProviderRefusedError";
}

export function readProvider(env: Env): ProviderName {
  const value = env["LLM_PROVIDER"]?.trim().toLowerCase();
  if (!value || value === "vertex") return "vertex";
  if (value === "apinex") return "apinex";
  throw new ProviderConfigError("invalid_setting", "LLM_PROVIDER must be vertex or apinex");
}

export type GateResult =
  { allowed: true } | { allowed: false; code: ProviderErrorCode; message: string };

/**
 * Vertex AI runs in the company's own Google Cloud project, so it takes every
 * class. apinex is a third party that has not been vetted:
 *  - synthetic text is always fine;
 *  - typed trip requests only while ALLOW_THIRD_PARTY_LLM_UNTIL names a date
 *    (yyyy-mm-dd, valid through the end of that day in UTC), so the owner has
 *    to look at the allowance again when it lapses;
 *  - employee records never go, whatever the flag says.
 */
export function checkGate(
  provider: ProviderName,
  dataClass: DataClass,
  env: Env,
  now: Date,
): GateResult {
  if (provider === "vertex" || dataClass === "synthetic") return { allowed: true };
  if (dataClass === "employee_records") {
    return refuse(
      "records_never_third_party",
      "apinex never receives employee records (calendar, email, receipts)",
    );
  }
  const until = env["ALLOW_THIRD_PARTY_LLM_UNTIL"]?.trim();
  if (!until) {
    return refuse(
      "third_party_not_allowed",
      "apinex may receive typed trip requests only while ALLOW_THIRD_PARTY_LLM_UNTIL names a future date (yyyy-mm-dd)",
    );
  }
  const end = endOfDayUtc(until);
  if (end === undefined) {
    return refuse(
      "third_party_allowance_invalid",
      "ALLOW_THIRD_PARTY_LLM_UNTIL must be a date like 2026-11-30",
    );
  }
  if (now.getTime() > end) {
    return refuse(
      "third_party_allowance_expired",
      `ALLOW_THIRD_PARTY_LLM_UNTIL (${until}) has passed. Review apinex and set a new date to continue`,
    );
  }
  return { allowed: true };
}

function refuse(code: ProviderErrorCode, message: string): GateResult {
  return { allowed: false, code, message };
}

function endOfDayUtc(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  const start = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-31 over into March, so check the date came back unchanged.
  const real =
    start.getUTCFullYear() === year &&
    start.getUTCMonth() === month - 1 &&
    start.getUTCDate() === day;
  return real ? start.getTime() + 24 * 60 * 60 * 1000 - 1 : undefined;
}

const APINEX_HOST = "apinex.bond";

const DEFAULT_APINEX_BASE_URL = {
  openai: "https://apinex.bond/v1",
  google: "https://apinex.bond/v1beta",
} as const;

export interface ApinexConfig {
  baseURL: string;
  apiKey: string;
  modelId: string;
  /** Wire format: OpenAI chat completions or Google generateContent. */
  format: "openai" | "google";
  /** The gateway accepts and enforces a JSON schema. Off by default, as gateways often break it. */
  jsonSchema: boolean;
}

/**
 * The API key is sent to whatever host this resolves to, so only https URLs on
 * apinex.bond (or a subdomain) are accepted. A typo or a stray environment
 * variable cannot point the key somewhere else.
 */
export function validateApinexBaseUrl(raw: string): string {
  const invalid = () =>
    new ProviderConfigError(
      "invalid_setting",
      `APINEX_BASE_URL must be an https URL on ${APINEX_HOST}`,
      "apinex",
    );
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid();
  }
  const hostOk = url.hostname === APINEX_HOST || url.hostname.endsWith(`.${APINEX_HOST}`);
  if (url.protocol !== "https:" || !hostOk) throw invalid();
  if (url.username || url.password || url.search || url.hash) throw invalid();
  return url.toString().replace(/\/+$/, "");
}

export function apinexConfig(env: Env): ApinexConfig {
  const format = (env["APINEX_API_FORMAT"]?.trim().toLowerCase() || "openai") as string;
  if (format !== "openai" && format !== "google") {
    throw new ProviderConfigError(
      "invalid_setting",
      "APINEX_API_FORMAT must be openai or google",
      "apinex",
    );
  }
  const jsonSchema = env["APINEX_JSON_SCHEMA"]?.trim().toLowerCase() || "false";
  if (jsonSchema !== "true" && jsonSchema !== "false") {
    throw new ProviderConfigError(
      "invalid_setting",
      "APINEX_JSON_SCHEMA must be true or false",
      "apinex",
    );
  }
  const apiKey = env["APINEX_API_KEY"]?.trim();
  if (!apiKey) {
    throw new ProviderConfigError("not_configured", "APINEX_API_KEY is not set", "apinex");
  }
  const modelId = env["APINEX_MODEL"]?.trim();
  if (!modelId) {
    throw new ProviderConfigError("not_configured", "APINEX_MODEL is not set", "apinex");
  }
  return {
    baseURL: validateApinexBaseUrl(
      env["APINEX_BASE_URL"]?.trim() || DEFAULT_APINEX_BASE_URL[format],
    ),
    apiKey,
    modelId,
    format,
    jsonSchema: jsonSchema === "true",
  };
}

/** `fetch` is only passed in tests, to read the request without a network. */
export function createApinexModel(config: ApinexConfig, fetch?: typeof globalThis.fetch) {
  const shared = { baseURL: config.baseURL, apiKey: config.apiKey, ...(fetch ? { fetch } : {}) };
  const model =
    config.format === "google"
      ? createGoogleGenerativeAI(shared)(config.modelId)
      : createOpenAICompatible({
          ...shared,
          name: "apinex",
          supportsStructuredOutputs: config.jsonSchema,
        }).chatModel(config.modelId);
  // Gateways often wrap the JSON in a markdown fence even when asked for plain JSON.
  return wrapLanguageModel({ model, middleware: extractJsonMiddleware() });
}

/**
 * Gemini on Vertex AI. On Cloud Run the attached service account provides
 * credentials through Application Default Credentials, so no key file is used.
 */
function vertexModel(agent: AgentModelId, env: Env): ResolvedModel {
  const project = env["GOOGLE_VERTEX_PROJECT"]?.trim();
  if (!project) {
    throw new ProviderConfigError("not_configured", "GOOGLE_VERTEX_PROJECT is not set", "vertex");
  }
  const { model, location } = vertexModelConfig(agent, env);
  return {
    provider: "vertex",
    modelId: model,
    model: createVertex({ project, location })(model),
    enforcesSchema: true,
    thirdParty: false,
    providerOptions: { vertex: { thinkingConfig: { thinkingLevel: "low" } } },
  };
}

function apinexModel(env: Env): ResolvedModel {
  const config = apinexConfig(env);
  return {
    provider: "apinex",
    modelId: config.modelId,
    model: createApinexModel(config),
    enforcesSchema: config.jsonSchema,
    thirdParty: true,
    // Without this the Google adapter would send a response schema the gateway may reject.
    ...(config.format === "google"
      ? { providerOptions: { google: { structuredOutputs: config.jsonSchema } } }
      : {}),
  };
}

/** The gate runs first, so a refused call never builds a client or touches a key. */
export function resolveModel(
  agent: AgentModelId,
  dataClass: DataClass,
  env: Env = process.env,
  now: Date = new Date(),
): ResolvedModel {
  const provider = readProvider(env);
  const gate = checkGate(provider, dataClass, env, now);
  if (!gate.allowed) throw new ProviderRefusedError(gate.code, gate.message, provider);
  return provider === "vertex" ? vertexModel(agent, env) : apinexModel(env);
}
