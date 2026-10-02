export type Stage = "discovery" | "planning" | "confirmed" | "live" | "post";

export const STAGES: { id: Stage; label: string; unlock: string }[] = [
  { id: "discovery", label: "Discovery", unlock: "Trip request created" },
  { id: "planning", label: "Planning", unlock: "Unlocks once the trip need is approved" },
  { id: "confirmed", label: "Confirmed", unlock: "Unlocks once an itinerary option is approved" },
  { id: "live", label: "Live", unlock: "Unlocks 6 hours before departure" },
  { id: "post", label: "Post-Trip", unlock: "Unlocks after you reach home" },
];

export type AgentId = "discovery" | "pretrip" | "live" | "post";

export const AGENTS: Record<AgentId, { name: string; short: string }> = {
  discovery: { name: "Discovery Agent", short: "Discovery" },
  pretrip: { name: "Pre-Trip Agent", short: "Pre-Trip" },
  live: { name: "Live Trip Agent", short: "Live" },
  post: { name: "Post-Trip Agent", short: "Post-Trip" },
};

export type Autonomy = "suggest" | "approve" | "auto";

export interface Coords {
  lat: number;
  lng: number;
}

export type PlaceKind = "airport" | "hotel" | "restaurant" | "meeting";

export interface Place extends Coords {
  id: string;
  kind: PlaceKind;
  name: string;
  detail?: string;
}

export interface Weights {
  time: number;
  comfort: number;
  cost: number;
}

export interface ItineraryOption {
  id: string;
  label: string;
  costINR: number;
  doorToDoorMins: number;
  comfort: number; // 1-5
  policyScore: number; // 0-100
  violations: string[];
  flight: string;
  hotel: string;
  hotelNightlyINR: number;
  cab: string;
}

export interface Booking {
  id: string;
  type: "flight" | "hotel" | "cab";
  title: string;
  detail: string;
  ref: string;
  status: string;
  alternatives: { title: string; detail: string }[];
}

export interface Decision {
  id: string;
  tripId: string;
  agent: AgentId;
  title: string;
  reasoning: string;
  confidence: number; // 0-100
  alternatives: string[];
  /** Effect applied to the trip when the traveller approves. */
  action?: "rebook";
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface ActivityEntry {
  id: string;
  at: string;
  agent: AgentId;
  text: string;
  mode: "auto" | "approval";
}

export interface Expense {
  id: string;
  category: "Flight" | "Hotel" | "Cab" | "Meals" | "Other";
  description: string;
  amountINR: number;
  sharedWith?: { name: string; tripId: string; city: string }[];
  source: "auto" | "manual";
}

export interface Trip {
  id: string;
  title: string;
  purpose: string;
  city: string;
  cityTier: "metro" | "other";
  originCity: string;
  startDate: string; // ISO
  endDate: string; // ISO
  stage: Stage;
  activeAgent: AgentId;
  lastAction: string;
  weights: Weights;
  places: Place[];
  bookings: Booking[];
  options: ItineraryOption[];
  selectedOptionId?: string;
  budgetINR: number;
  expenses: Expense[];
  activity: ActivityEntry[];
  autonomy: Record<AgentId, Autonomy>;
  discovery: {
    trigger: string;
    businessValue: number;
    conflicts: string[];
    policyFit: string;
  };
  live: {
    flight: string;
    cab: string;
    hotel: string;
    disrupted: boolean;
  };
  extractedBy?: "ai" | "rules";
}

export interface Preferences {
  seat: string;
  airlines: string[];
  timeOfDay: string;
  meal: string;
  hotelChains: string[];
  roomType: string;
}

export type Persona = "employee" | "desk" | "manager";

export type EscalationKind = "fare" | "hotel" | "booking" | "assistance" | "sameday";

export interface Escalation {
  id: string;
  tripId: string;
  kind: EscalationKind;
  title: string;
  detail: string;
  createdAt: string;
  slaMins: number;
  assignee?: string;
  status: "open" | "resolved";
  note?: string;
  exceptionId?: string;
}

export interface PolicyException {
  id: string;
  tripId: string;
  title: string;
  justification: string;
  policyCostINR: number;
  requestedCostINR: number;
  recommendation: string;
  agentRecommends: "approve" | "reject";
  optionId?: string;
  escalationId?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
}
