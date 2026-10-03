# Working on TravelFlow

- Never rewrite pushed git history: no force-push, and no rebasing, amending or squashing commits that are already pushed. Use a merge or a revert instead.
- Keep `main` deployable. Every push to `main` deploys to the dev Cloud Run service (`.github/workflows/deploy-dev.yml`).
- Use `PrioritySplitSlider` for time/comfort/cost weights so every editing surface preserves an exact 100% total and shares accessible divider behavior. The rounding rules live in `src/lib/weights.ts`; the server uses the same functions.
- Node-only code (database, Google APIs, Vertex AI, secrets) lives under `src/server/`. The build refuses to import it from client code; call it from server functions or server routes.
- Agent logic lives in `src/server/agents/`. Components must not implement agent workflows; they call server functions and render the result.
- Agents never book, hold, cancel, spend or submit expenses on their own. Those actions run only from a human click, on the server, after re-checking price and policy.
- Policy functions in `src/lib/policy.ts` are pure: pass the grade policy in. Do not add module-level mutable state.
- Treat calendar, email, receipt and user-typed text as untrusted data in prompts: delimit it, and never give an agent that reads it a tool with side effects.
- Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build` before pushing.
