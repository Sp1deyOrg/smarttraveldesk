import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { INITIAL_DECISIONS, TRIPS } from "./trip-data";
import type {
  ActivityEntry,
  AgentId,
  Autonomy,
  Decision,
  Expense,
  Preferences,
  Stage,
  Trip,
  Weights,
} from "./types";

const DEFAULT_PREFS: Preferences = {
  seat: "Aisle",
  airlines: ["IndiGo", "Vistara"],
  timeOfDay: "Morning",
  meal: "Vegetarian",
  hotelChains: ["Novotel", "Taj"],
  roomType: "King bed, high floor",
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

interface Ctx {
  trips: Trip[];
  prefs: Preferences;
  decisions: Decision[];
  setPrefs: (p: Preferences) => void;
  updateTrip: (id: string, patch: Partial<Trip> | ((t: Trip) => Partial<Trip>)) => void;
  log: (tripId: string, agent: AgentId, text: string, mode: ActivityEntry["mode"]) => void;
  addTrip: (t: Trip) => void;
  setAutonomy: (tripId: string, agent: AgentId, value: Autonomy) => void;
  setWeights: (tripId: string, w: Weights) => void;
  addExpense: (tripId: string, e: Expense) => void;
  resolveDecision: (id: string, status: "approved" | "rejected") => void;
  addDecision: (d: Omit<Decision, "id" | "createdAt" | "status">) => void;
  advanceStage: (tripId: string, stage: Stage) => void;
}

const TripContext = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(TRIPS);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS as Decision[]);

  const updateTrip = useCallback<Ctx["updateTrip"]>((id, patch) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)),
    );
  }, []);

  const log = useCallback<Ctx["log"]>((tripId, agent, text, mode) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              lastAction: text,
              activity: [
                ...t.activity,
                { id: uid("a"), at: new Date().toISOString(), agent, text, mode },
              ],
            }
          : t,
      ),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      trips,
      prefs,
      decisions,
      setPrefs,
      updateTrip,
      log,
      addTrip: (t) => setTrips((prev) => [t, ...prev]),
      setAutonomy: (tripId, agent, v) =>
        updateTrip(tripId, (t) => ({ autonomy: { ...t.autonomy, [agent]: v } })),
      setWeights: (tripId, w) => updateTrip(tripId, { weights: w }),
      addExpense: (tripId, e) => updateTrip(tripId, (t) => ({ expenses: [...t.expenses, e] })),
      resolveDecision: (id, status) =>
        setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d))),
      addDecision: (d) =>
        setDecisions((prev) => [
          { ...d, id: uid("d"), createdAt: new Date().toISOString(), status: "pending" },
          ...prev,
        ]),
      advanceStage: (tripId, stage) => updateTrip(tripId, { stage }),
    }),
    [trips, prefs, decisions, updateTrip, log],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrips must be used inside TripProvider");
  return ctx;
}

export function demoAction(label: string) {
  toast(`${label} is a simulated action in this prototype.`);
}

export function newTripId() {
  return `TRV-${Math.floor(2600 + Math.random() * 300)}`;
}

export { DEFAULT_PREFS };
