# TravelFlow AI

Build "TravelFlow", an agentic corporate travel app for a single employee at a large Indian MNC. Build it as one coherent, well-structured app from the start: one shared source of truth for trip data and state, a consistent layout grid, and no dead buttons (every button either works or shows a short toast saying it is a demo action). Earlier versions of this idea got messy through patching, so structure matters more than volume.

CORE IDEA
Four AI agents run a trip end to end and hand off to each other: Discovery Agent (works out whether a trip is needed from calendar/CRM/email events, business value and policy fit), Pre-Trip Agent (builds 3–5 ranked itinerary options), Live Trip Agent (takes over 6 hours before departure, monitors everything, handles small tasks itself and asks approval for critical ones, stays active until the traveller reaches the final destination) and Post-Trip Agent (expenses, analytics, learning). The agents do the work; the employee only makes decisions. Single traveller only: no group trip or traveller-count options anywhere.

HOME SCREEN (desktop landscape first, stacks cleanly on mobile)
1. Top bar: TravelFlow logo, search trips, "Set Preferences" button, "New Trip" button.
2. "Plan a trip" command bar: the employee types a request in plain English, e.g. "Client review at Infosys Mysuru campus 14–16 Oct, prefer morning flights, keep it within policy". The Discovery Agent extracts destination, dates, purpose, meeting venue and a suggested time/comfort/cost weighting that sums to 100. Show the result in an editable confirmation card; highlight missing or unclear fields instead of guessing; create the trip in the Discovery stage only after the user confirms. Use Lovable's built-in AI for this extraction. If AI is unavailable, fall back to a simple rule-based parser and show a small label saying which one was used.
3. Upper area split into two unequal parts:
   - Left, about two-thirds: "Current Trip" — the trip that is live or starts within a day, with its stage stepper, the active agent, and its latest action.
   - Right, about one-third: "Actions Now" — time-windowed cards such as web check-in (appears 48 hours before departure, disappears 1 hour before), document checklist (24 hours before) and hotel early check-in request. Below them, an "Needs your decision" queue: items an agent cannot do alone (policy exception, choosing between two options, confirming a rebooking), each showing the agent's reasoning, a confidence level, and Approve / Reject / See alternatives buttons.
4. Lower area: all other trips as docked cards in a grid, each showing title, city, dates, stage badge, the agent's last action and a progress bar.

TRIP DETAIL
Clicking a trip card expands it in place with a smooth transition until it fills the screen (no new page or route). The background is fully covered and blurred, every control inside the expanded card is clickable (clicks must never reach the page underneath), and it closes with a close button or the Esc key.
- Header: title, dates, status badge, and a stage stepper: Discovery → Planning → Confirmed → Live → Post-Trip. The current stage is unlocked; future stages show a lock icon with a tooltip saying what unlocks them.
- Left column: a portrait-shaped map (Leaflet with OpenStreetMap tiles, no API key) with four compact filter chips in a single line overlaid at the top of the map: Airport, Hotel, Restaurants, Meeting location. Below the map, a "Trip locations" list showing distances in km calculated from coordinates (e.g. "Airport — 5.2 km from hotel", "Hotel — 3.1 km from meeting venue").
- Right column, top: bookings as three small cards in one row — Flight, Hotel, Cab — each editable inline with alternatives to pick from.
- Right column, below: a stage-specific panel:
  - Discovery: the triggering calendar/CRM event, a business-value score, detected conflicts, a policy-fit summary, and actions: Review requirements, View alternatives, Dismiss trip.
  - Planning: 3–5 itinerary options ranked by a weighted score from time/comfort/cost sliders (always summing to 100%, re-ranking live as sliders move). Each option shows cost in INR, door-to-door duration, a comfort rating and a policy score. Policy violations are flagged with a plain-language reason. Allow comparing two options side by side, then approving one.
  - Confirmed: confirmation numbers, a day-by-day timeline, Add to calendar, Download tickets.
  - Live: real-time status for flight, cab and hotel, plus a "Simulate disruption" button (flight delayed 2 hours). The Live Trip Agent then proposes a rebooking, drafts a note to the meeting organiser and moves the cab pickup; small changes happen automatically and are logged, while the rebooking waits for approval.
  - Post-Trip: expenses auto-drafted from the bookings, receipt upload, trip analytics (spend against policy, time saved) and a short feedback form.
- Quick-action and trip-insight cards relevant to the stage (web check-in, early check-in, add-ons, change plan).
- An expense card: spend so far vs trip budget, a category split, and an "Add Expense" button that opens a side panel. In that panel the employee can tag colleagues who shared the expense; each tagged colleague shows a short "resolving trip…" state, then either their matched trip ID and city (read-only, auto-filled) or a clear error if no matching trip exists. Submit stays disabled until every tagged colleague resolves.
- An agent activity log: timestamped entries of what each agent did, each marked "done automatically" or "needed approval", plus an autonomy setting per agent: Suggest only / Act with approval / Act automatically. The setting must actually change behaviour in the simulated flows (e.g. with "Act automatically" the rebooking goes through without appearing in the decision queue).

TRAVEL POLICY (grade-based)
The employee is grade L4 (Manager). Example rules: economy class for flights under 3 hours, hotel cap ₹8,000 per night in metro cities and ₹6,000 elsewhere, sedan cabs. Use these rules in option scoring, violation flags and the decision queue.

SET PREFERENCES
A dialog for flight preferences (seat, preferred airlines, time of day), meal preference and hotel preferences (chains, room type). Preferences influence how options are ranked.

DATA
Realistic Indian corporate data in INR: 6 trips spread across all five stages in cities like Mumbai, Bengaluru, Hyderabad, Delhi NCR, Pune and Chennai, with real airports, business hotels and office venues with correct coordinates. Make trip dates relative to today so one trip is always live or starting within a day and the time-windowed cards are visible.

TRANSPARENCY
Add a small "About this prototype" info button in the top bar listing what is real (AI trip extraction, option scoring, policy checks, distance calculation) and what is simulated (bookings, live flight status, calendar/CRM data).

DESIGN
Clean, light enterprise look with plenty of whitespace, a clear hierarchy, subtle motion, and consistent spacing. Nothing overlapping or crowded.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smarttraveldesk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/74ada09f-d195-4883-bd8f-743dfec06df1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
