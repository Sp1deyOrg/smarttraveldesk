# TravelFlow Employee Screens

## Goal
Build the complete Employee experience on the existing shared trip store, policy engine, extraction flow, seeded trips, and utilities. Keep persona switching, Travel Desk, and Manager work out of this step.

## What will be built
- A shared Employee shell with the TravelFlow top bar, trip search, New Trip, Set Preferences, and About controls, structured so a persona switcher can be added later without redesigning the header.
- A plan-a-trip command flow that uses the existing AI extraction function, falls back to the existing rules parser, shows the source, highlights missing fields, allows edits, and creates a Discovery-stage trip only after confirmation.
- The Employee home dashboard with a two-thirds Current Trip area, one-third Actions Now and decision queue, and a responsive grid of the remaining trips.
- A full-screen in-place trip detail experience with backdrop blur, close and Escape handling, locked stage indicators, location map and filters, trip distances, editable booking choices, quick actions, expenses, and agent activity.
- All five stage panels:
  - Discovery: business need, conflicts, policy fit, and working actions.
  - Planning: live weighted ranking, policy flags, two-option comparison, and itinerary approval.
  - Confirmed: references, timeline, calendar, and ticket actions.
  - Live: current statuses and disruption simulation whose rebooking behavior follows the Live Agent autonomy setting.
  - Post-Trip: drafted expenses, receipt action, analytics, and feedback.
- An Add Expense side panel with colleague-trip resolution, error states, and submission blocked until every tagged colleague resolves.
- Agent autonomy controls that update the shared store and alter simulated approval versus automatic behavior.
- Set Preferences and About dialogs, with preferences feeding the existing ranking logic.

## Interaction and state rules
- Reuse `TripProvider` as the only state source; extend it only where an Employee workflow needs a shared mutation.
- Every control will either change shared state, open a real view, or show the existing demo-action toast.
- Trip detail remains on the home route and opens in place; no trip-detail route will be added.
- New trips use realistic seeded defaults for unsupported itinerary details while preserving the employee’s confirmed extracted fields.
- Search filters the trip cards by title, city, purpose, or trip ID.
- No traveller-count, group travel, persona switcher, Travel Desk, or Manager UI will be introduced.

## Technical structure
- Split the screen into focused travel components for the header, planner, dashboard sections, trip detail, map, stage panels, expenses, activity, and dialogs.
- Dynamically load the Leaflet map only in the browser to keep server rendering safe.
- Use existing design-system controls and semantic tokens; add only narrowly scoped global styling needed for the full-screen transition and map.
- Add unique home-route metadata required for the Employee dashboard.

## Validation
- Verify the home screen at desktop and mobile widths.
- Exercise trip extraction fallback handling, trip creation, search, decision actions, planning approval, disruption behavior across autonomy modes, expense colleague resolution, booking alternatives, preferences, and Escape-to-close.
- Check browser console output and ensure no placeholder page or dead controls remain.
