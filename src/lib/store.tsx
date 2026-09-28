import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { INITIAL_DECISIONS, TRIPS } from "./trip-data";
import { INITIAL_ESCALATIONS, INITIAL_EXCEPTIONS } from "./desk-data";
import { POLICY_GRADES, applyGradePolicies, type GradePolicy } from "./policy";
import type {
  ActivityEntry,
  AgentId,
  Autonomy,
  Decision,
  Escalation,
  Expense,
  Persona,
  PolicyException,
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

type NewDecision = Omit<Decision, "id" | "createdAt" | "status">;

interface Ctx {
  trips: Trip[];
  prefs: Preferences;
  decisions: Decision[];
  persona: Persona;
  escalations: Escalation[];
  exceptions: PolicyException[];
  grades: GradePolicy[];
  setPersona: (p: Persona) => void;
  setPrefs: (p: Preferences) => void;
  updateTrip: (id: string, patch: Partial<Trip> | ((t: Trip) => Partial<Trip>)) => void;
  log: (tripId: string, agent: AgentId, text: string, mode: ActivityEntry["mode"]) => void;
  addTrip: (t: Trip) => void;
  setAutonomy: (tripId: string, agent: AgentId, value: Autonomy) => void;
  setWeights: (tripId: string, w: Weights) => void;
  addExpense: (tripId: string, e: Expense) => void;
  resolveDecision: (id: string, status: "approved" | "rejected") => void;
  addDecision: (d: NewDecision) => void;
  advanceStage: (tripId: string, stage: Stage) => void;
  addEscalation: (e: Omit<Escalation, "id" | "createdAt" | "status">) => void;
  assignEscalation: (id: string, assignee: string) => void;
  resolveEscalation: (id: string, note: string) => void;
  raiseException: (x: Omit<PolicyException, "id" | "createdAt" | "status">) => string;
  decideException: (id: string, status: "approved" | "rejected", comment: string) => void;
  setGrades: (g: GradePolicy[]) => void;
}

const TripContext = createContext<Ctx | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(TRIPS);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS as Decision[]);
  const [persona, setPersona] = useState<Persona>("employee");
  const [escalations, setEscalations] = useState<Escalation[]>(INITIAL_ESCALATIONS);
  const [exceptions, setExceptions] = useState<PolicyException[]>(INITIAL_EXCEPTIONS);
  const [grades, setGradesState] = useState<GradePolicy[]>(() => POLICY_GRADES.map((g) => ({ ...g })));

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

  const addDecision = useCallback((d: NewDecision) => {
    setDecisions((prev) => [
      { ...d, id: uid("d"), createdAt: new Date().toISOString(), status: "pending" },
      ...prev,
    ]);
  }, []);

  const value = useMemo<Ctx>(() => {
    const resolveEscalationInner = (id: string, note: string, notify: boolean) => {
      const e = escalations.find((x) => x.id === id);
      if (!e || e.status === "resolved") return;
      setEscalations((prev) => prev.map((x) => (x.id === id ? { ...x, status: "resolved", note } : x)));
      if (notify) {
        log(e.tripId, "pretrip", `Travel Desk resolved “${e.title}”: ${note}`, "approval");
        addDecision({
          tripId: e.tripId,
          agent: "pretrip",
          title: `Travel Desk update: ${e.title}`,
          reasoning: note,
          confidence: 100,
          alternatives: [],
        });
      }
    };

    return {
      trips,
      prefs,
      decisions,
      persona,
      escalations,
      exceptions,
      grades,
      setPersona,
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
      addDecision,
      advanceStage: (tripId, stage) => updateTrip(tripId, { stage }),
      addEscalation: (e) =>
        setEscalations((prev) => [
          { ...e, id: uid("esc"), createdAt: new Date().toISOString(), status: "open" },
          ...prev,
        ]),
      assignEscalation: (id, assignee) =>
        setEscalations((prev) => prev.map((x) => (x.id === id ? { ...x, assignee } : x))),
      resolveEscalation: (id, note) => resolveEscalationInner(id, note, true),
      raiseException: (x) => {
        const id = uid("x");
        setExceptions((prev) => [{ ...x, id, createdAt: new Date().toISOString(), status: "pending" }, ...prev]);
        if (x.escalationId) {
          setEscalations((prev) => prev.map((e) => (e.id === x.escalationId ? { ...e, exceptionId: id } : e)));
        }
        log(x.tripId, "pretrip", `Policy exception sent to manager: ${x.title}`, "approval");
        return id;
      },
      decideException: (id, status, comment) => {
        const x = exceptions.find((e) => e.id === id);
        if (!x || x.status !== "pending") return;
        setExceptions((prev) => prev.map((e) => (e.id === id ? { ...e, status, comment } : e)));
        const verb = status === "approved" ? "approved" : "rejected";
        log(x.tripId, "pretrip", `Manager ${verb} exception “${x.title}”: ${comment}`, "approval");
        if (status === "approved" && x.optionId) {
          updateTrip(x.tripId, (t) =>
            t.stage === "planning" ? { selectedOptionId: x.optionId, stage: "confirmed" } : {},
          );
        }
        const linked = escalations.find((e) => e.id === x.escalationId || e.exceptionId === id);
        if (linked) resolveEscalationInner(linked.id, `Manager ${verb}: ${comment}`, false);
        addDecision({
          tripId: x.tripId,
          agent: "pretrip",
          title: `Manager ${verb}: ${x.title}`,
          reasoning:
            status === "approved"
              ? `${comment} The Pre-Trip Agent will book as requested.`
              : `${comment} Approve to let the Pre-Trip Agent switch to the best compliant option.`,
          confidence: 100,
          alternatives: [],
        });
      },
      setGrades: (g) => {
        applyGradePolicies(g);
        setGradesState(g.map((x) => ({ ...x })));
      },
    };
  }, [trips, prefs, decisions, persona, escalations, exceptions, grades, updateTrip, log, addDecision]);

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
