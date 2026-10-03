import type { ItineraryOption, Preferences, Trip } from "@/lib/types";

export function makeOption(over: Partial<ItineraryOption> = {}): ItineraryOption {
  return {
    id: "o",
    label: "Option",
    costINR: 20000,
    doorToDoorMins: 300,
    comfort: 3,
    policyScore: 90,
    violations: [],
    flight: "IndiGo 6E 123 · 09:00",
    hotel: "Lemon Tree",
    hotelNightlyINR: 5000,
    cab: "Sedan",
    ...over,
  };
}

export const NO_PREFS: Preferences = {
  seat: "Aisle",
  airlines: [],
  timeOfDay: "No preference",
  meal: "Vegetarian",
  hotelChains: [],
  roomType: "",
};

export function makeTrip(over: Partial<Trip> = {}): Trip {
  return {
    id: "TRV-1",
    title: "Test trip",
    purpose: "Client review",
    city: "Pune",
    cityTier: "other",
    originCity: "Bengaluru",
    startDate: "2026-10-14T08:00:00.000Z",
    endDate: "2026-10-16T20:00:00.000Z",
    stage: "planning",
    activeAgent: "pretrip",
    lastAction: "",
    weights: { time: 40, comfort: 25, cost: 35 },
    places: [],
    bookings: [],
    options: [],
    budgetINR: 35000,
    expenses: [],
    activity: [],
    autonomy: { discovery: "approve", pretrip: "approve", live: "approve", post: "approve" },
    discovery: { trigger: "", businessValue: 0, conflicts: [], policyFit: "" },
    live: { flight: "", cab: "", hotel: "", disrupted: false },
    ...over,
  } as Trip;
}
