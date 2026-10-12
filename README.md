# TravelFlow

An agentic corporate travel and expense (T&E) portal with Employee, Travel Desk and Manager portals. Agents do the rule-based work (detecting trips, ranking options, checking policy and GST, drafting expenses); people make the decisions.

The original product spec is in [docs/original-spec.md](docs/original-spec.md).

## Status

The app is moving from a browser-only demo to a live MVP on Google Cloud. Each phase ends in a deployable build:

| Phase           | What becomes real                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **0 (current)** | Runs on Cloud Run (`asia-south1`); trip extraction uses Gemini on Vertex AI or apinex.bond, switched with `LLM_PROVIDER`; CI and tests |
| 1a              | Google sign-in, roles, Postgres (Cloud SQL), persisted trips and audit log                                                             |
| 1b              | Google Calendar connection; the Discovery agent drafts trips from real events                                                          |
| 2               | Live test-mode flight (Duffel) and hotel (LiteAPI) search, approvals, outbound email                                                   |
| 3               | Inbound email, receipt capture with Gemini, GST validation, expenses                                                                   |
| 4               | Live trip disruptions, desk triage, audit, SLAs                                                                                        |
| 5               | Microsoft 365 / Outlook, production project, custom domain                                                                             |

Everything except trip extraction still runs on seeded demo data until Phase 1a.

## Run locally

Requires [bun](https://bun.sh) 1.3+ and Node 22+.

```sh
bun install
cp .env.example .env   # git-ignored; fill in one provider below
bun run dev            # http://localhost:8080
```

`bun run dev` reads `.env`. A production build reads real environment variables only. Restart after editing.

Without a working provider the trip planner falls back to the built-in rule parser and labels the card "Rules fallback". When a model answers, the card names the provider, for example "AI extracted (apinex)". The server logs one `llm_call` line per call with the provider, model, data class, outcome and reason, and never the prompt, the reply or a key.

### Choose the model provider

`LLM_PROVIDER` picks where the Discovery agent's model calls go: `vertex` (default) or `apinex`. Switching is a restart. A call never fails over from one provider to the other.

| Variable         | Example  | Purpose                           |
| ---------------- | -------- | --------------------------------- |
| `LLM_PROVIDER`   | `apinex` | `vertex` (default) or `apinex`    |
| `LLM_TIMEOUT_MS` | `20000`  | Abort an LLM call after this long |

**vertex** is Gemini on Vertex AI in your own Google Cloud project. Sign in with `gcloud auth application-default login` and set:

| Variable                 | Example            | Purpose                               |
| ------------------------ | ------------------ | ------------------------------------- |
| `GOOGLE_VERTEX_PROJECT`  | `travelflow-dev`   | GCP project that hosts Vertex AI      |
| `GOOGLE_VERTEX_LOCATION` | `asia-south1`      | Vertex region (default `asia-south1`) |
| `GEMINI_FLASH_MODEL`     | `gemini-3.5-flash` | Model used by the Discovery agent     |

**apinex** is the third-party gateway at [apinex.bond](https://apinex.bond). It has not been vetted, so it is gated:

- Every LLM call declares a data class. apinex takes `synthetic` text freely and typed trip requests (`employee_text`) only while `ALLOW_THIRD_PARTY_LLM_UNTIL` names a future date. Emails, phone numbers, GSTIN, PAN and Aadhaar numbers are masked before the request leaves. Names are not. Without the date the request is refused and the rule parser answers.
- Employee records (calendar events, email, receipts) are never sent to apinex, so Phase 1b onwards stays on Vertex until apinex has written approval.
- The key is sent only to `apinex.bond` (or a subdomain). Any other `APINEX_BASE_URL` is refused.

| Variable                      | Example                    | Purpose                                                             |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `APINEX_API_KEY`              |                            | Your key. Keep it in `.env`, never in chat or git                   |
| `APINEX_MODEL`                | `<id from the model list>` | Model the gateway should use                                        |
| `ALLOW_THIRD_PARTY_LLM_UNTIL` | `2026-11-30`               | Last day (UTC) that typed trip requests may go to apinex            |
| `APINEX_API_FORMAT`           | `openai`                   | Wire format: `openai` (default) or `google`                         |
| `APINEX_BASE_URL`             | `https://apinex.bond/v1`   | Default `/v1` for `openai`, `/v1beta` for `google`                  |
| `APINEX_JSON_SCHEMA`          | `false`                    | `true` only if the gateway enforces a JSON schema (default `false`) |

Not sure what the gateway speaks? Run the probe on your own machine: `APINEX_API_KEY=... ./infra/probe-apinex.sh` lists its models, tries each wire format and prints the settings to use. Its output holds no key.

## Checks

```sh
bun run lint
bun run typecheck
bun run test       # vitest
bun run build      # nitro node-server output in .output/
bun run start      # serve the build on $PORT (default 3000)
```

## Deploy to Google Cloud

1. Create a GCP project (for example `travelflow-dev`) with billing enabled.
2. In Cloud Shell, from a clone of this repo, run:

   ```sh
   PROJECT_ID=travelflow-dev GITHUB_REPO=<owner>/smarttraveldesk ./infra/bootstrap.sh
   ```

   It enables the APIs and creates the Artifact Registry repo, the runtime, deployer and invoker service accounts, and Workload Identity Federation for GitHub Actions. No service-account keys are created.

3. Add the variables it prints to the GitHub repo (Settings → Secrets and variables → Actions → Variables).
4. Check which Gemini models your project can use in Mumbai, and set `GEMINI_FLASH_MODEL` as a repo variable if the default is not available:

   ```sh
   PROJECT_ID=travelflow-dev ./infra/probe-vertex.sh
   ```

5. Push to `main`. `.github/workflows/deploy-dev.yml` builds the Docker image, deploys the `travelflow` Cloud Run service and smoke-tests it.

### If the smoke test returns 403

Google Cloud organizations created from a Workspace account since May 2024 enforce **Domain restricted sharing** by default. It blocks the `allUsers` grant that makes the Cloud Run service public, so the deploy succeeds but every request gets 403. To allow it for this project only:

1. In the Cloud console, select your **organization** (not the project), open **IAM & Admin → IAM**, and grant yourself **Organization Policy Administrator**.
2. Switch to the project, open **IAM & Admin → Organization policies**, and find **Domain restricted sharing** (`iam.allowedPolicyMemberDomains`). If your org shows **Restrict allowed policy members in IAM allow policies** (`iam.managed.allowedPolicyMembers`) instead, use that one.
3. **Manage policy → Override parent's policy → Replace → Add a rule → Allow All**, then **Set policy**.
4. Re-run **Actions → Deploy dev → Run workflow**.

## Layout

```
src/routes/          TanStack Start file routes
src/components/      UI (shadcn/ui primitives in components/ui, product screens in components/travel)
src/lib/             isomorphic logic: policy scoring, weights, rule parser, trip utilities, types
src/server/          Node-only code (never bundled for the browser): agents, LLM access
tests/               vitest unit tests
infra/               one-time Google Cloud setup scripts
docs/                original spec and build history
```
