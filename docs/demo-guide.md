# TravelFlow demo guide

A 12 to 15 minute walkthrough of the three portals, plus setup, a pre-demo checklist and likely questions.

## 1. Before the demo

### Run it

Requires bun 1.3+ and Node 22+.

```sh
bun install
bun run build
bun run start      # http://localhost:3000
```

Use the production build (`build` + `start`) rather than `bun run dev`. It loads faster and behaves like the deployed app.

### AI extraction or rules fallback

The trip planner calls Gemini on Vertex AI when credentials are present. Without them it uses the built-in rule parser and the brief shows a **Rules fallback** badge. Both paths complete the demo.

To show Gemini, before starting the server:

```sh
gcloud auth application-default login
export GOOGLE_VERTEX_PROJECT=<your-project-id>
export GEMINI_FLASH_MODEL=<a model that answers in asia-south1>   # check with infra/probe-vertex.sh
```

The brief then shows **AI extracted**.

### Hosted URL

The `Deploy dev` workflow has not deployed yet. Both runs on `main` were skipped because the GCP repository variables are not set. To demo from a URL, follow "Deploy to Google Cloud" in the README first.

### Checklist (10 minutes before)

- [ ] Server running, page opens on the **Employee** persona.
- [ ] Internet is on. Map tiles come from OpenStreetMap and the font from Google Fonts. Everything else is bundled.
- [ ] Browser zoom at 100%, window at least 1280 px wide.
- [ ] Refresh the page once. **All data is in memory, so a refresh resets every trip, decision and exception to the seeded state.** Use this to reset between rehearsals or after a mistake.
- [ ] Notifications and other tabs closed.

## 2. The story in one line

Agents do the rule-based work of a corporate trip (structure the request, rank options, check policy, react to disruptions, draft expenses). People make every decision that books, spends or breaks policy.

Personas, switched from the dropdown at top right:

| Persona     | Person                | Sees                                                 |
| ----------- | --------------------- | ---------------------------------------------------- |
| Employee    | Riya Sharma, grade L4 | Trip planner, current trip, decisions, all trips     |
| Travel Desk | Anita Rao             | Escalations, booking console, live tracker, invoices |
| Manager     | Vikram Nair           | Policy exception inbox                               |

## 3. Click path

### Act 1. Employee plans a trip (4 min)

1. On **Employee**, type in the Discovery Agent box:
   `Sales kickoff at BKC Mumbai 12-14 Dec, prefer morning flights`
   Click **Plan trip**.
2. The **Confirm the trip brief** card appears. Point out:
   - fields the agent could not find are highlighted as **Needs your input**, it never invents them
   - the time/comfort/cost split always totals 100%
   - nothing is created until the person confirms
3. Click **Create in Discovery**. The trip opens. Show the map pinned at Mumbai airport and BKC.
4. In **Is this trip worth making?** click **View alternatives** to show the "move by a week" and "meet over video" options. Then click **Review requirements**.
5. **Ranked itinerary options** appear. Drag a divider on the priority bar and watch the ranking change. Options outside policy are flagged in red with the reason.
6. Click **Approve option** on a "Within policy" option. The trip moves to **Confirmed** with flight, hotel and cab references, a day-by-day timeline, **Add to calendar** (.ics) and **Download tickets**.
7. Close the trip (X or Esc).

### Act 2. A policy exception goes to the manager (3 min)

1. Open **Client review, Delhi NCR** (Planning).
2. Approve the **Most comfortable** option (Business class and Taj, above the hotel cap). The toast says **Outside policy, sent to your manager for approval**. The agent did not book it.
3. Switch persona to **Manager**. The new exception is at the top with policy vs requested cost, the difference, and the agent's recommendation.
4. Type a comment (required) and click **Approve**.
5. Switch back to **Employee** and open the Delhi trip. It is now **Confirmed**, and the activity log records the manager's decision.

### Act 3. Live trip disruption (2 min)

1. On **Employee**, open the current trip **Quarterly business review, Mumbai** (Live).
2. Click **Simulate disruption**. The Live Trip Agent drafts a recovery plan. Because its autonomy is "Act with approval", the rebooking waits for Riya in **Needs your decision**.
3. Scroll to **Agent autonomy** and show that each agent can be set to suggest, act with approval, or act automatically, per trip.

### Act 4. Post-trip expenses (1 min)

1. Open **Partner summit, Chennai** (Post-Trip).
2. Show the auto-drafted expense report, the receipts still missing, and **Upload receipt**.

### Act 5. Travel Desk (3 min)

Switch to **Travel Desk**.

1. **Desk home**: open escalations, pending exceptions, month spend against budget.
2. **Booking console**: the same ranking the employee saw, with Hold and Confirm.
3. **Live tracker**: travellers on the road on a map.
4. **Policy & exceptions**: grade-wise caps the agents use, editable here. Change the L4 metro hotel cap and Riya's options are re-scored and re-flagged on every screen. Below it, the exception audit log.
5. **Invoice reconciliation** and **Spend analytics** to close.

Finish with the **?** icon (About this prototype), which lists what is working logic and what is simulated.

## 4. What is real and what is simulated

| Working logic                                         | Simulated                                |
| ----------------------------------------------------- | ---------------------------------------- |
| Trip extraction (Gemini on Vertex AI, or rule parser) | Flight, hotel and cab search and booking |
| Option scoring against time/comfort/cost weights      | Booking references (PNR, hotel, cab)     |
| Grade policy checks and exception routing             | Live flight status and disruptions       |
| Distance calculation on the map                       | Calendar and CRM data                    |
| Calendar (.ics) and ticket downloads                  | Phone, message and vendor email delivery |
| Receipt attachment (kept in the browser)              | Sign-in, roles and a database (Phase 1a) |

Itinerary options for a newly planned trip are mock data that stand in for live search (Phase 2). New-trip map pins use the city's airport and business district for 14 Indian cities. Other cities show "No locations yet".

## 5. Likely questions

**Can the agent book on its own?** No. Booking, holding, cancelling and spending run only from a human click. Choosing an option outside policy routes it to the manager instead of booking it.

**What if the AI is down?** The planner falls back to the rule parser and labels the brief "Rules fallback". The demo path is the same.

**Is the user's text safe to send to the model?** Request text is treated as untrusted data. It is delimited in the prompt, the model is told never to follow instructions inside it, and the extraction agent has no tools with side effects. Request text is never logged.

**Where does it run?** Cloud Run in `asia-south1` (Mumbai), with Gemini on Vertex AI in the same region. Deploys use Workload Identity Federation, so no service-account keys exist.

**What comes next?** See the phase table in the README: Google sign-in and Postgres (1a), Google Calendar (1b), live flight and hotel search in test mode (2), receipts and GST validation (3), live disruptions and SLAs (4), Microsoft 365 (5).

## 6. If something goes wrong

| Symptom                               | Fix                                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| You clicked the wrong thing           | Refresh the page. All data resets to the seeded state.              |
| Map is grey                           | No internet for OpenStreetMap tiles. Pins and distances still work. |
| "AI extraction was unavailable" toast | Expected without Vertex credentials. Carry on with the brief.       |
| Port 3000 busy                        | `PORT=3001 bun run start`                                           |
