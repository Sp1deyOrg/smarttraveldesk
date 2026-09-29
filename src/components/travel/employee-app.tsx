import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  MapPin,
  Plane,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { extractTrip, type TripExtraction } from "@/lib/extract-trip.functions";
import { ruleParse } from "@/lib/rule-parser";
import { demoAction, newTripId, useTrips } from "@/lib/store";
import {
  currentTrip,
  formatDateRange,
  stageProgress,
  timedActions,
} from "@/lib/trip-utils";
import { AGENTS, STAGES, type Trip } from "@/lib/types";
import { AboutDialog, PreferencesDialog } from "./employee-dialogs";
import { TripDetail } from "./trip-detail";
import { PersonaSwitcher, SectionHeading } from "./workspace";

const SAMPLE_REQUEST =
  "Client review at Infosys Mysuru campus 14–16 Oct, prefer morning flights, keep it within policy";

const fieldLabels: Record<string, string> = {
  destinationCity: "Destination",
  startDate: "Start date",
  endDate: "End date",
  purpose: "Purpose",
  meetingVenue: "Meeting venue",
};

export function EmployeeApp() {
  const { trips, decisions, resolveDecision, log } = useTrips();
  const [search, setSearch] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const plannerRef = useRef<HTMLTextAreaElement>(null);
  const featured = currentTrip(trips);
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const query = search.trim().toLowerCase();
  const otherTrips = trips.filter((trip) => {
    if (trip.id === featured?.id) return false;
    if (!query) return true;
    return [trip.title, trip.city, trip.purpose, trip.id].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
  const pending = decisions.filter((decision) => decision.status === "pending").slice(0, 2);

  const focusPlanner = () => {
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    plannerRef.current?.focus();
  };

  const decide = (id: string, tripId: string, status: "approved" | "rejected") => {
    resolveDecision(id, status);
    log(
      tripId,
      decisions.find((decision) => decision.id === id)?.agent ?? "pretrip",
      `${status === "approved" ? "Approved" : "Rejected"} an agent recommendation`,
      "approval",
    );
    toast.success(`Recommendation ${status}`);
  };

  if (!featured) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">No trips available.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        search={search}
        onSearch={setSearch}
        onNewTrip={focusPlanner}
        onPreferences={() => setPreferencesOpen(true)}
        onAbout={() => setAboutOpen(true)}
      />

      <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        <TripPlanner inputRef={plannerRef} onCreated={setSelectedTripId} />

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div>
            <SectionHeading eyebrow="In progress" title="Current trip" />
            <CurrentTrip trip={featured} onOpen={() => setSelectedTripId(featured.id)} />
          </div>
          <aside className="space-y-5">
            <ActionsNow trip={featured} />
            <DecisionQueue
              decisions={pending}
              onApprove={(id, tripId) => decide(id, tripId, "approved")}
              onReject={(id, tripId) => decide(id, tripId, "rejected")}
              onAlternatives={(tripId) => setSelectedTripId(tripId)}
            />
          </aside>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <SectionHeading eyebrow="Your travel" title={query ? "Matching trips" : "Other trips"} />
            <p className="text-sm text-muted-foreground">
              {otherTrips.length} {otherTrips.length === 1 ? "trip" : "trips"}
            </p>
          </div>
          {otherTrips.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {otherTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onOpen={() => setSelectedTripId(trip.id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-card py-12 text-center">
              <Search className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-3 font-semibold">No trips match “{search}”</p>
              <Button className="mt-3" variant="outline" onClick={() => setSearch("")}>Clear search</Button>
            </div>
          )}
        </section>
      </main>

      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      {selectedTrip ? <TripDetail trip={selectedTrip} onClose={() => setSelectedTripId(null)} /> : null}
    </div>
  );
}

function Header({
  search,
  onSearch,
  onNewTrip,
  onPreferences,
  onAbout,
}: {
  search: string;
  onSearch: (value: string) => void;
  onNewTrip: () => void;
  onPreferences: () => void;
  onAbout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Plane className="size-5 -rotate-12" />
          </div>
          <div>
            <p className="font-extrabold leading-none">TravelFlow</p>
            <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">Employee</p>
          </div>
        </div>
        <div className="order-3 flex w-full items-center md:order-none md:w-[min(28vw,360px)]">
          <Search className="pointer-events-none ml-3 mr-[-28px] size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search trips"
            aria-label="Search trips"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onAbout} aria-label="About this prototype">
          <CircleHelp />
        </Button>
        <Button className="hidden sm:inline-flex" variant="outline" onClick={onPreferences}>
          <Settings2 />Set preferences
        </Button>
        <Button onClick={onNewTrip}><Plus />New trip</Button>
        <PersonaSwitcher />
        <Button className="order-4 w-full sm:hidden" variant="outline" onClick={onPreferences}>
          <Settings2 />Set preferences
        </Button>
      </div>
    </header>
  );
}

function TripPlanner({
  inputRef,
  onCreated,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onCreated: (tripId: string) => void;
}) {
  const { addTrip } = useTrips();
  const runExtraction = useServerFn(extractTrip);
  const [request, setRequest] = useState("");
  const [result, setResult] = useState<TripExtraction | null>(null);
  const [source, setSource] = useState<"ai" | "rules">("ai");
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    if (request.trim().length < 3) {
      toast.error("Describe the trip first");
      return;
    }
    setLoading(true);
    try {
      const extraction = await runExtraction({ data: { text: request.trim() } });
      setResult(extraction);
      setSource("ai");
    } catch {
      setResult(ruleParse(request.trim()));
      setSource("rules");
      toast("AI extraction was unavailable, so TravelFlow used its rule parser.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof TripExtraction, value: string | number) => {
    setResult((current) => (current ? { ...current, [field]: value } : current));
  };

  const create = () => {
    if (!result) return;
    const required = ["destinationCity", "startDate", "endDate", "purpose", "meetingVenue"] as const;
    const missing = required.filter((field) => !String(result[field]).trim());
    if (missing.length) {
      toast.error(`Complete ${missing.map((field) => fieldLabels[field]).join(", ")}`);
      return;
    }
    const total = result.weightTime + result.weightComfort + result.weightCost;
    if (total !== 100) {
      toast.error("Time, comfort and cost must total 100%");
      return;
    }
    const id = newTripId();
    const seed = makeDiscoveryTrip(id, result, source);
    addTrip(seed);
    toast.success(`${id} created in Discovery`);
    setResult(null);
    setRequest("");
    onCreated(id);
  };

  return (
    <section className="overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-6">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-4" />
            <p className="text-xs font-extrabold uppercase">Discovery Agent</p>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Where do you need to be?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Describe the business trip. The agent will structure it before anything is created.</p>
          <Textarea
            ref={inputRef}
            className="mt-5 min-h-24 resize-none text-base"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder={SAMPLE_REQUEST}
            aria-label="Describe your trip"
          />
        </div>
        <Button className="h-11 lg:min-w-36" onClick={analyse} disabled={loading}>
          {loading ? <><Bot className="animate-pulse" />Extracting…</> : <>Plan trip<ArrowRight /></>}
        </Button>
      </div>
      {result ? (
        <ConfirmationCard
          result={result}
          source={source}
          onUpdate={update}
          onCancel={() => setResult(null)}
          onConfirm={create}
        />
      ) : null}
    </section>
  );
}

function ConfirmationCard({
  result,
  source,
  onUpdate,
  onCancel,
  onConfirm,
}: {
  result: TripExtraction;
  source: "ai" | "rules";
  onUpdate: (field: keyof TripExtraction, value: string | number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const missing = (field: keyof TripExtraction) => !String(result[field]).trim();
  return (
    <div className="animate-rise border-t bg-muted/40 p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Confirm the trip brief</h2>
            <Badge variant={source === "ai" ? "default" : "outline"}>{source === "ai" ? "AI extracted" : "Rules fallback"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Review every field before the Discovery Agent starts.</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Cancel trip brief"><X /></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ExtractionField label="Destination" value={result.destinationCity} missing={missing("destinationCity")} onChange={(value) => onUpdate("destinationCity", value)} />
        <ExtractionField label="Start date" type="date" value={result.startDate.slice(0, 10)} missing={missing("startDate")} onChange={(value) => onUpdate("startDate", value)} />
        <ExtractionField label="End date" type="date" value={result.endDate.slice(0, 10)} missing={missing("endDate")} onChange={(value) => onUpdate("endDate", value)} />
        <ExtractionField label="Purpose" value={result.purpose} missing={missing("purpose")} onChange={(value) => onUpdate("purpose", value)} />
        <ExtractionField label="Meeting venue" value={result.meetingVenue} missing={missing("meetingVenue")} onChange={(value) => onUpdate("meetingVenue", value)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
        <WeightField label="Time" value={result.weightTime} onChange={(value) => onUpdate("weightTime", value)} />
        <WeightField label="Comfort" value={result.weightComfort} onChange={(value) => onUpdate("weightComfort", value)} />
        <WeightField label="Cost" value={result.weightCost} onChange={(value) => onUpdate("weightCost", value)} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">{result.notes || "No assumptions were added."}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}><Check />Create in Discovery</Button>
        </div>
      </div>
    </div>
  );
}

function ExtractionField({ label, value, missing, onChange, type = "text" }: { label: string; value: string; missing: boolean; onChange: (value: string) => void; type?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input className={missing ? "border-warning ring-1 ring-warning" : ""} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={missing ? "Required" : undefined} />{missing ? <p className="text-[11px] font-semibold text-warning-foreground">Needs your input</p> : null}</div>;
}

function WeightField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-1.5"><Label>{label} priority (%)</Label><Input type="number" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function CurrentTrip({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const activeStage = STAGES.find((stage) => stage.id === trip.stage);
  return (
    <article className="relative overflow-hidden rounded-md border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Badge>{activeStage?.label}</Badge><span className="text-xs font-bold text-muted-foreground">{trip.id}</span></div>
          <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl"><button type="button" onClick={onOpen} className="rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{trip.title}</button></h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="size-4" />{trip.originCity} → {trip.city}</span><span className="flex items-center gap-1"><CalendarDays className="size-4" />{formatDateRange(trip)}</span></p>
        </div>
        <Button onClick={onOpen}>Open trip<ChevronRight /></Button>
      </div>
      <div className="mt-8 grid grid-cols-5 gap-1">
        {STAGES.map((stage, index) => {
          const activeIndex = STAGES.findIndex((item) => item.id === trip.stage);
          return <div key={stage.id}><div className={`h-1.5 rounded-full ${index <= activeIndex ? "bg-primary" : "bg-muted"}`} /><p className={`mt-2 truncate text-[10px] font-bold sm:text-xs ${index === activeIndex ? "text-primary" : "text-muted-foreground"}`}>{stage.label}</p></div>;
        })}
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-accent/60 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Active now</p><p className="mt-2 flex items-center gap-2 font-bold"><Bot className="size-4 text-primary" />{AGENTS[trip.activeAgent].name}</p></div>
        <div className="rounded-md bg-muted p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Latest action</p><p className="mt-2 text-sm font-semibold">{trip.lastAction}</p></div>
      </div>
    </article>
  );
}

function ActionsNow({ trip }: { trip: Trip }) {
  const actions = timedActions(trip);
  return (
    <section>
      <SectionHeading eyebrow="Time sensitive" title="Actions now" />
      <div className="space-y-3">
        {actions.length ? actions.map((action) => <div key={action.id} className="rounded-md border bg-card p-4 shadow-sm"><div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Clock3 className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{action.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{action.detail}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => demoAction(action.cta)}>{action.cta}</Button></div></div></div>) : <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">The active agent has no time-sensitive actions for you.</div>}
      </div>
    </section>
  );
}

function DecisionQueue({ decisions, onApprove, onReject, onAlternatives }: { decisions: ReturnType<typeof useTrips>["decisions"]; onApprove: (id: string, tripId: string) => void; onReject: (id: string, tripId: string) => void; onAlternatives: (tripId: string) => void }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Needs your decision</h2><Badge variant="secondary">{decisions.length}</Badge></div>
      <div className="space-y-3">
        {decisions.length ? decisions.map((decision) => <article key={decision.id} className="rounded-md border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-primary">{AGENTS[decision.agent].name}</p><h3 className="mt-1 font-bold">{decision.title}</h3></div><span className="shrink-0 text-xs font-bold text-muted-foreground">{decision.confidence}% sure</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{decision.reasoning}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" onClick={() => onApprove(decision.id, decision.tripId)}>Approve</Button><Button size="sm" variant="outline" onClick={() => onReject(decision.id, decision.tripId)}>Reject</Button><Button className="col-span-2" size="sm" variant="ghost" onClick={() => onAlternatives(decision.tripId)}>See alternatives<ChevronRight /></Button></div></article>) : <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">You’re all caught up. Agents will surface only decisions they cannot make alone.</div>}
      </div>
    </section>
  );
}

function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const label = STAGES.find((stage) => stage.id === trip.stage)?.label ?? trip.stage;
  return <article className="group flex min-h-64 flex-col rounded-md border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center justify-between gap-3"><Badge variant="outline">{label}</Badge><span className="text-xs font-bold text-muted-foreground">{trip.id}</span></div><h3 className="mt-5 text-lg font-extrabold"><button type="button" onClick={onOpen} className="rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{trip.title}</button></h3><p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{trip.city} · {formatDateRange(trip)}</p><div className="mt-5 flex-1 rounded-md bg-muted p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Last agent action</p><p className="mt-1 text-sm font-medium leading-5">{trip.lastAction}</p></div><div className="mt-4 flex items-center gap-3"><Progress value={stageProgress(trip.stage)} aria-label={`${label} progress`} /><span className="text-xs font-bold text-muted-foreground">{Math.round(stageProgress(trip.stage))}%</span></div><Button className="mt-4 w-full" variant="outline" onClick={onOpen}>View trip<ChevronRight /></Button></article>;
}


function makeDiscoveryTrip(id: string, result: TripExtraction, source: "ai" | "rules"): Trip {
  const city = result.destinationCity.trim();
  const isMetro = ["Mumbai", "Bengaluru", "Bangalore", "Hyderabad", "Delhi", "Delhi NCR", "Chennai", "Kolkata"].some((name) => city.toLowerCase().includes(name.toLowerCase()));
  const start = new Date(`${result.startDate.slice(0, 10)}T08:00:00`).toISOString();
  const end = new Date(`${result.endDate.slice(0, 10)}T20:00:00`).toISOString();
  return {
    id,
    title: result.title.trim() || `${result.purpose} — ${city}`,
    purpose: result.purpose.trim(),
    city,
    cityTier: isMetro ? "metro" : "other",
    originCity: "Bengaluru",
    startDate: start,
    endDate: end,
    stage: "discovery",
    activeAgent: "discovery",
    lastAction: "Reviewing business need, calendar conflicts and policy fit",
    weights: { time: result.weightTime, comfort: result.weightComfort, cost: result.weightCost },
    places: [
      { id: "meeting", kind: "meeting", name: result.meetingVenue.trim(), lat: 12.2958, lng: 76.6394, detail: city },
      { id: "hotel", kind: "hotel", name: "Hotel to be selected", lat: 12.3044, lng: 76.6552 },
      { id: "airport", kind: "airport", name: "Arrival point to be confirmed", lat: 12.2308, lng: 76.6558 },
    ],
    bookings: [
      { id: "b-flight", type: "flight", title: "Agent researching", detail: "3–5 policy-compliant options will appear in Planning", ref: "Not held", status: "Pending", alternatives: [] },
      { id: "b-hotel", type: "hotel", title: "Agent researching", detail: `Target cap ₹${isMetro ? "8,000" : "6,000"} per night`, ref: "Not held", status: "Pending", alternatives: [] },
      { id: "b-cab", type: "cab", title: "Sedan required", detail: "Pickup will be aligned to the final itinerary", ref: "Not held", status: "Pending", alternatives: [] },
    ],
    options: [],
    budgetINR: 35000,
    expenses: [],
    activity: [{ id: `a-${Date.now()}`, at: new Date().toISOString(), agent: "discovery", text: "Created the trip brief and started discovery", mode: "approval" }],
    autonomy: { discovery: "approve", pretrip: "approve", live: "approve", post: "auto" },
    discovery: { trigger: "Employee travel request", businessValue: 0, conflicts: ["Calendar and CRM checks in progress"], policyFit: "Assessment in progress" },
    live: { flight: "Not booked", cab: "Not booked", hotel: "Not booked", disrupted: false },
    extractedBy: source,
  };
}