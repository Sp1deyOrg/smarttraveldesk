# TravelFlow

An agentic corporate travel and expense (T&E) portal with Employee, Travel Desk and Manager portals. Agents do the rule-based work (detecting trips, ranking options, checking policy and GST, drafting expenses); people make the decisions.

The original product spec is in [docs/original-spec.md](docs/original-spec.md).

## Status

The app is moving from a browser-only demo to a live MVP on Google Cloud. Each phase ends in a deployable build:

| Phase           | What becomes real                                                                         |
| --------------- | ----------------------------------------------------------------------------------------- |
| **0 (current)** | Runs on Cloud Run (`asia-south1`); trip extraction uses Gemini on Vertex AI; CI and tests |
| 1a              | Google sign-in, roles, Postgres (Cloud SQL), persisted trips and audit log                |
| 1b              | Google Calendar connection; the Discovery agent drafts trips from real events             |
| 2               | Live test-mode flight (Duffel) and hotel (LiteAPI) search, approvals, outbound email      |
| 3               | Inbound email, receipt capture with Gemini, GST validation, expenses                      |
| 4               | Live trip disruptions, desk triage, audit, SLAs                                           |
| 5               | Microsoft 365 / Outlook, production project, custom domain                                |

Everything except trip extraction still runs on seeded demo data until Phase 1a.

## Run locally

Requires [bun](https://bun.sh) 1.3+ and Node 22+.

```sh
bun install
bun run dev        # http://localhost:8080
```

Without Vertex credentials the trip planner falls back to the built-in rule parser and labels the card "Rules fallback". To use Gemini locally, sign in with `gcloud auth application-default login` and set:

| Variable                 | Example            | Purpose                               |
| ------------------------ | ------------------ | ------------------------------------- |
| `GOOGLE_VERTEX_PROJECT`  | `travelflow-dev`   | GCP project that hosts Vertex AI      |
| `GOOGLE_VERTEX_LOCATION` | `asia-south1`      | Vertex region (default `asia-south1`) |
| `GEMINI_FLASH_MODEL`     | `gemini-3.5-flash` | Model used by the Discovery agent     |
| `LLM_TIMEOUT_MS`         | `20000`            | Abort an LLM call after this long     |

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
