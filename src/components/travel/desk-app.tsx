import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration, formatINR } from "@/lib/geo";
import { policyViolations, rankOptions, type GradePolicy } from "@/lib/policy";
import { useTrips } from "@/lib/store";
import {
  COMPANY_GSTIN,
  DEPARTMENT_SPEND,
  DESK_USER,
  EMPLOYEE_NAME,
  EMPLOYEE_PHONE,
  INVOICES,
  MONTH_BUDGET_INR,
  MONTH_SPEND_BASE_INR,
  OTHER_TRAVELLERS,
  type Invoice,
} from "@/lib/desk-data";
import type { Escalation, Place } from "@/lib/types";
import { Kpi, SectionHeading, WorkspaceHeader } from "./workspace";

const TripMap = lazy(() => import("./trip-map"));

const TABS = [
  ["home", "Desk home"],
  ["queue", "Requests & escalations"],
  ["console", "Booking console"],
  ["tracker", "Live tracker"],
  ["policy", "Policy & exceptions"],
  ["invoices", "Invoice reconciliation"],
  ["analytics", "Spend analytics"],
] as const;
type Tab = (typeof TABS)[number][0];

const KIND_LABEL: Record<Escalation["kind"], string> = {
  fare: "Fare above policy",
  hotel: "No hotel under cap",
  booking: "Failed booking",
  assistance: "Special assistance",
  sameday: "Same-day change",
  change: "Plan change",
};

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function DeskApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [consoleTrip, setConsoleTrip] = useState<string | null>(null);
  const openConsole = (tripId: string) => {
    setConsoleTrip(tripId);
    setTab("console");
  };
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader />
      <nav className="border-b bg-card" aria-label="Travel Desk sections">
        <div
          className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6"
          role="tablist"
          aria-label="Travel Desk sections"
        >
          {TABS.map(([id, label]) => (
            <Button
              key={id}
              variant="ghost"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-auto shrink-0 rounded-none border-b-2 px-3 py-3 text-sm font-semibold ${tab === id ? "border-primary text-primary hover:text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        {tab === "home" && <DeskHome onTab={setTab} />}
        {tab === "queue" && <Queue onConsole={openConsole} />}
        {tab === "console" && <BookingConsole tripId={consoleTrip} onTrip={setConsoleTrip} />}
        {tab === "tracker" && <Tracker />}
        {tab === "policy" && <PolicyScreen />}
        {tab === "invoices" && <Invoices />}
        {tab === "analytics" && <Analytics />}
      </main>
    </div>
  );
}

function monthSpend(trips: ReturnType<typeof useTrips>["trips"]) {
  return (
    MONTH_SPEND_BASE_INR +
    trips.reduce((s, t) => s + t.expenses.reduce((a, e) => a + e.amountINR, 0), 0)
  );
}

function DeskHome({ onTab }: { onTab: (t: Tab) => void }) {
  const { trips, escalations, exceptions } = useTrips();
  const open = escalations.filter((e) => e.status === "open");
  const onRoad = trips.filter((t) => t.stage === "live").length + OTHER_TRAVELLERS.length;
  const pendingX = exceptions.filter((x) => x.status === "pending");
  const spend = monthSpend(trips);
  const acts = trips.flatMap((t) => t.activity);
  const autoShare = acts.length
    ? Math.round((acts.filter((a) => a.mode === "auto").length / acts.length) * 100)
    : 0;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Open requests" value={String(open.length)} />
        <Kpi label="Travellers on the road" value={String(onRoad)} />
        <Kpi label="Pending exceptions" value={String(pendingX.length)} hint="Awaiting manager" />
        <Kpi
          label="Month spend vs budget"
          value={formatINR(spend)}
          hint={`${Math.round((spend / MONTH_BUDGET_INR) * 100)}% of ${formatINR(MONTH_BUDGET_INR)}`}
        />
        <Kpi label="Handled automatically" value={`${autoShare}%`} hint="Share of agent tasks" />
      </div>
      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div>
          <SectionHeading
            eyebrow="Needs the desk"
            title="Open escalations"
            right={
              <Button variant="outline" size="sm" onClick={() => onTab("queue")}>
                Open queue
              </Button>
            }
          />
          <div className="space-y-2">
            {open.slice(0, 5).map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-sm"
              >
                <span>
                  <Badge variant="secondary" className="mr-2">
                    {KIND_LABEL[e.kind]}
                  </Badge>
                  {e.title}
                </span>
                <span className="text-muted-foreground">{e.tripId}</span>
              </div>
            ))}
            {!open.length && <EmptyState>Queue is clear.</EmptyState>}
          </div>
        </div>
        <aside>
          <SectionHeading eyebrow="With managers" title="Pending exceptions" />
          <div className="space-y-2">
            {pendingX.map((x) => (
              <div key={x.id} className="rounded-md border bg-card p-3 text-sm">
                <p className="font-semibold">{x.title}</p>
                <p className="text-xs text-muted-foreground">
                  {x.tripId} · +{formatINR(x.requestedCostINR - x.policyCostINR)}
                </p>
              </div>
            ))}
            {!pendingX.length && <EmptyState>No exceptions are waiting.</EmptyState>}
          </div>
        </aside>
      </section>
    </>
  );
}

function Queue({ onConsole }: { onConsole: (tripId: string) => void }) {
  const { escalations } = useTrips();
  const [show, setShow] = useState<"open" | "resolved">("open");
  const now = useNow();
  const list = escalations.filter((e) => e.status === show);
  return (
    <section>
      <SectionHeading
        eyebrow="Agents could not finish"
        title="Request & escalation queue"
        right={
          <div className="flex gap-1">
            {(["open", "resolved"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={show === s ? "default" : "outline"}
                onClick={() => setShow(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((e) => (
          <EscalationCard key={e.id} e={e} now={now} onConsole={onConsole} />
        ))}
      </div>
      {!list.length && <EmptyState>No {show} requests.</EmptyState>}
    </section>
  );
}

function EscalationCard({
  e,
  now,
  onConsole,
}: {
  e: Escalation;
  now: number | null;
  onConsole: (tripId: string) => void;
}) {
  const { trips, assignEscalation, resolveEscalation, raiseException } = useTrips();
  const [note, setNote] = useState("");
  const trip = trips.find((t) => t.id === e.tripId);
  const left =
    now === null
      ? null
      : Math.round((new Date(e.createdAt).getTime() + e.slaMins * 60_000 - now) / 60_000);
  return (
    <article className="rounded-md border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge variant="secondary">{KIND_LABEL[e.kind]}</Badge>
          <h3 className="mt-2 font-bold">{e.title}</h3>
          <p className="text-xs text-muted-foreground">
            {e.tripId} · {trip?.title} · Riya Sharma
          </p>
        </div>
        {e.status === "open" && left !== null && (
          <span
            className={`text-xs font-bold ${left < 15 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {left < 0 ? `SLA breached ${-left}m ago` : `SLA ${left}m left`}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{e.detail}</p>
      {e.assignee && <p className="mt-2 text-xs font-semibold">Assigned to {e.assignee}</p>}
      {e.status === "resolved" ? (
        <p className="mt-3 rounded-md bg-success/10 p-2 text-sm">Resolved: {e.note}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!!e.assignee}
              onClick={() => {
                assignEscalation(e.id, DESK_USER);
                toast.success("Assigned to you");
              }}
            >
              Assign to me
            </Button>
            <Button size="sm" variant="outline" onClick={() => onConsole(e.tripId)}>
              Open in booking console
            </Button>
            {(e.kind === "fare" || e.kind === "hotel") && !e.exceptionId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  raiseException({
                    tripId: e.tripId,
                    escalationId: e.id,
                    title: e.title,
                    justification: e.detail,
                    policyCostINR: trip?.budgetINR ? Math.round(trip.budgetINR * 0.6) : 10000,
                    requestedCostINR: trip?.budgetINR ? Math.round(trip.budgetINR * 0.72) : 12000,
                    recommendation: "Approve: no compliant option meets the agenda.",
                    agentRecommends: "approve",
                  });
                  toast.success("Sent to manager for exception approval");
                }}
              >
                Send to manager
              </Button>
            )}
            {e.exceptionId && <Badge>Awaiting manager</Badge>}
          </div>
          <Textarea
            className="mt-3"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="Resolution note for the traveller"
            aria-label="Resolution note"
          />
          <Button
            className="mt-2 w-full"
            disabled={!note.trim()}
            onClick={() => {
              resolveEscalation(e.id, note.trim());
              toast.success("Resolved — the traveller's trip has been updated");
            }}
          >
            Resolve
          </Button>
        </>
      )}
    </article>
  );
}

function BookingConsole({
  tripId,
  onTrip,
}: {
  tripId: string | null;
  onTrip: (id: string) => void;
}) {
  const { trips, prefs, travellerPolicy, updateTrip, log, escalations, resolveEscalation } =
    useTrips();
  const trip =
    trips.find((t) => t.id === tripId) ?? trips.find((t) => t.stage === "planning") ?? trips[0];
  const [held, setHeld] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const ranked = useMemo(
    () =>
      trip ? rankOptions(trip.options, trip.weights, trip.cityTier, travellerPolicy, prefs) : [],
    [trip, prefs, travellerPolicy],
  );
  if (!trip) return null;
  const confirm = (id: string, label: string) => {
    updateTrip(trip.id, (t) => ({
      selectedOptionId: id,
      stage: t.stage === "planning" || t.stage === "discovery" ? "confirmed" : t.stage,
    }));
    log(trip.id, "pretrip", `Travel Desk confirmed '${label}'`, "approval");
    escalations
      .filter((e) => e.tripId === trip.id && e.status === "open")
      .forEach((e) => resolveEscalation(e.id, `Booked '${label}' via the desk console.`));
    toast.success("Booking confirmed");
  };
  return (
    <section>
      <SectionHeading
        eyebrow="Booking console"
        title={`${trip.title} · ${trip.city}`}
        right={
          <Select
            value={trip.id}
            onValueChange={(v) => {
              onTrip(v);
              setHeld(null);
            }}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trips.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.id} · {t.city} ({t.stage})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Same scoring as the employee view · weights time {trip.weights.time}% / comfort{" "}
        {trip.weights.comfort}% / cost {trip.weights.cost}%.
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="space-y-3">
          {ranked.map(({ option, score, violations }, i) => (
            <div key={option.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-bold">
                    #{i + 1} {option.label}{" "}
                    {held === option.id && <Badge className="ml-2">On hold</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {option.flight} · {option.hotel} · {option.cab}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatINR(option.costINR)}</p>
                  <p className="text-xs text-muted-foreground">
                    Score {score} · {formatDuration(option.doorToDoorMins)}
                  </p>
                </div>
              </div>
              {violations.length ? (
                <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {violations.join(" · ")}
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-success">Within policy</p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHeld(option.id);
                    log(
                      trip.id,
                      "pretrip",
                      `Travel Desk placed a hold on '${option.label}'`,
                      "auto",
                    );
                    toast.success("Fare and room held for 30 minutes");
                  }}
                >
                  Hold
                </Button>
                <Button size="sm" onClick={() => confirm(option.id, option.label)}>
                  Confirm
                </Button>
              </div>
            </div>
          ))}
          {!ranked.length && (
            <EmptyState>No itinerary options are available for this trip yet.</EmptyState>
          )}
        </div>
        <aside className="rounded-md border bg-card p-4">
          <p className="font-bold">Note to traveller</p>
          <Textarea
            className="mt-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Appears in Riya's agent activity log"
          />
          <Button
            className="mt-2 w-full"
            disabled={!note.trim()}
            onClick={() => {
              log(trip.id, "pretrip", `Travel Desk note: ${note.trim()}`, "approval");
              setNote("");
              toast.success("Note sent to traveller");
            }}
          >
            Send note
          </Button>
        </aside>
      </div>
    </section>
  );
}

interface Traveller {
  id: string;
  name: string;
  city: string;
  phone: string;
  status: string;
  alert?: string | undefined;
  /** Only the signed-in traveller has trips here; colleagues' `tripId`s are just sample references. */ ownTripId?: string;
}

function Tracker() {
  const { trips } = useTrips();
  const [hydrated, setHydrated] = useState(false);
  const [contact, setContact] = useState<Traveller | null>(null);
  useEffect(() => setHydrated(true), []);
  const live = trips.filter((t) => t.stage === "live");
  const people: (Traveller & { lat: number; lng: number })[] = [
    ...live.map((t) => {
      const p = t.places.find((x) => x.kind === "hotel") ?? t.places[0];
      return {
        id: t.id,
        ownTripId: t.id,
        name: EMPLOYEE_NAME,
        phone: EMPLOYEE_PHONE,
        city: t.city,
        lat: p?.lat ?? 0,
        lng: p?.lng ?? 0,
        status: t.live.flight,
        alert: t.live.disrupted ? "Flight delayed 2h · recovery plan in progress" : undefined,
      };
    }),
    ...OTHER_TRAVELLERS,
  ];
  const places: Place[] = people.map((p) => ({
    id: p.id,
    kind: "meeting",
    name: `${p.name} · ${p.city}`,
    detail: p.status,
    lat: p.lat,
    lng: p.lng,
  }));
  return (
    <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <div className="h-[520px] overflow-hidden rounded-md border bg-muted">
        {hydrated ? (
          <Suspense fallback={<MapLoading />}>
            <TripMap places={places} />
          </Suspense>
        ) : (
          <MapLoading />
        )}
      </div>
      <aside className="space-y-3">
        <SectionHeading eyebrow="On the road now" title={`${people.length} travellers`} />
        {people.map((p) => (
          <div
            key={p.id}
            className={`rounded-md border bg-card p-3 ${p.alert ? "border-warning" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {p.name} <span className="text-xs text-muted-foreground">· {p.city}</span>
              </p>
              <Button size="sm" variant="ghost" onClick={() => setContact(p)}>
                <Phone />
                Contact
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{p.status}</p>
            {p.alert && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-warning">
                <AlertTriangle className="size-3" />
                {p.alert}
              </p>
            )}
          </div>
        ))}
      </aside>
      {contact && (
        <ContactDialog key={contact.id} person={contact} onClose={() => setContact(null)} />
      )}
    </section>
  );
}

function ContactDialog({ person, onClose }: { person: Traveller; onClose: () => void }) {
  const { deskMessages, sendDeskMessage } = useTrips();
  const [text, setText] = useState("");
  const history = deskMessages.filter((m) => m.travellerId === person.id);
  const send = () => {
    sendDeskMessage(person.id, text.trim(), person.ownTripId);
    toast.success(`Message sent to ${person.name}`);
    setText("");
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {person.name}</DialogTitle>
          <DialogDescription>
            {person.city} · {person.status}
          </DialogDescription>
        </DialogHeader>
        {person.alert && (
          <p className="flex items-center gap-1 text-xs font-semibold text-warning">
            <AlertTriangle className="size-3" />
            {person.alert}
          </p>
        )}
        <Button asChild variant="outline">
          <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}>
            <Phone />
            Call {person.phone}
          </a>
        </Button>
        {history.length > 0 && (
          <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm">
            {history.map((m) => (
              <li key={m.id}>
                <p>{m.text}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            person.ownTripId
              ? "Appears in Riya's agent activity log"
              : "Write a message to the traveller"
          }
          aria-label={`Message to ${person.name}`}
        />
        <DialogFooter>
          <Button disabled={!text.trim()} onClick={send}>
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyScreen() {
  const { grades, setGrades, travellerPolicy, trips, exceptions } = useTrips();
  const flagged = trips.reduce(
    (s, t) =>
      s + t.options.filter((o) => policyViolations(o, t.cityTier, travellerPolicy).length).length,
    0,
  );
  const edit = (i: number, key: keyof GradePolicy, v: number) =>
    setGrades(grades.map((g, j) => (j === i ? { ...g, [key]: v } : g)));
  return (
    <>
      <section>
        <SectionHeading
          eyebrow="Grade-wise policy"
          title="Travel policy"
          right={<Badge variant="secondary">{flagged} options currently flagged</Badge>}
        />
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Grade</th>
                <th className="p-3">Hotel cap metro (₹)</th>
                <th className="p-3">Hotel cap other (₹)</th>
                <th className="p-3">Economy under (hrs)</th>
                <th className="p-3">Cab</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={g.grade} className="border-t">
                  <td className="p-3 font-semibold">
                    {g.grade} · {g.label}
                  </td>
                  {(["metroCap", "otherCap", "economyUnderHrs"] as const).map((k) => (
                    <td key={k} className="p-3">
                      <Input
                        type="number"
                        className="w-28"
                        value={g[k]}
                        onChange={(e) => edit(i, k, Number(e.target.value) || 0)}
                        aria-label={`${g.grade} ${k}`}
                      />
                    </td>
                  ))}
                  <td className="p-3">{g.cab}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          L4 changes re-score Riya's options and violation flags immediately across all screens.
        </p>
      </section>
      <section>
        <SectionHeading eyebrow="Audit" title="Exception log" />
        <div className="space-y-2">
          {exceptions.map((x) => (
            <div
              key={x.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-sm"
            >
              <span>
                <strong>{x.tripId}</strong> · {x.title}
              </span>
              <span className="text-muted-foreground">
                +{formatINR(x.requestedCostINR - x.policyCostINR)}
                {x.comment ? ` · ${x.comment}` : ""}
              </span>
              <Badge
                variant={
                  x.status === "rejected"
                    ? "destructive"
                    : x.status === "approved"
                      ? "default"
                      : "secondary"
                }
              >
                {x.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** What the desk asks the vendor for, one line per problem found on the invoice. */
function draftVendorRequest(inv: Invoice, flags: string[]) {
  const asks = flags.map((flag) => {
    if (flag.startsWith("Amount"))
      return `- Booked ${formatINR(inv.bookedINR)} but invoiced ${formatINR(inv.invoicedINR)}. Please issue a corrected invoice for ${formatINR(inv.bookedINR)}.`;
    if (flag.startsWith("Duplicate"))
      return `- Invoice ${inv.invoiceNo} has been issued twice. Please cancel the duplicate with a credit note.`;
    return `- The invoice does not carry our GSTIN (${COMPANY_GSTIN}). Please reissue it with the GSTIN so we can claim input tax credit.`;
  });
  return `Hello ${inv.vendor} billing team,\n\nWe found the following on invoice ${inv.invoiceNo} (${inv.bookingRef}, trip ${inv.tripId}):\n\n${asks.join("\n")}\n\nPlease reply with the corrected document at your earliest convenience.\n\nThanks,\n${DESK_USER}`;
}

function VendorRequestDialog({
  inv,
  flags,
  onClose,
}: {
  inv: Invoice;
  flags: string[];
  onClose: () => void;
}) {
  const { setInvoiceStatus } = useTrips();
  const [message, setMessage] = useState(() => draftVendorRequest(inv, flags));
  const send = () => {
    setInvoiceStatus(inv.id, "raised");
    toast.success(`Request sent to ${inv.vendor}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Raise with {inv.vendor}</DialogTitle>
          <DialogDescription>
            Corrected invoice request for {inv.invoiceNo}. Edit the message before sending.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="min-h-56"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Message to vendor"
        />
        <DialogFooter>
          <Button disabled={!message.trim()} onClick={send}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Invoices() {
  const { invoiceStatus, setInvoiceStatus } = useTrips();
  const [requesting, setRequesting] = useState<{ inv: Invoice; flags: string[] } | null>(null);
  const rows = INVOICES.map((inv) => {
    const flags: string[] = [];
    if (inv.invoicedINR !== inv.bookedINR)
      flags.push(`Amount mismatch (+${formatINR(inv.invoicedINR - inv.bookedINR)})`);
    if (
      INVOICES.some(
        (o) => o.id < inv.id && o.invoiceNo === inv.invoiceNo && o.vendor === inv.vendor,
      )
    )
      flags.push("Duplicate invoice");
    if (inv.type === "Hotel" && inv.gstin !== COMPANY_GSTIN)
      flags.push("Missing company GSTIN — ITC blocked");
    // A reconciled invoice has been corrected or cleared, so its problems no longer count.
    return { inv, flags: invoiceStatus[inv.id] === "reconciled" ? [] : flags };
  });
  const claimable = rows
    .filter((r) => !r.flags.some((f) => f.startsWith("Duplicate") || f.startsWith("Missing")))
    .reduce((s, r) => s + r.inv.gstINR, 0);
  const atRisk = rows.reduce((s, r) => s + r.inv.gstINR, 0) - claimable;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="GST credit claimable" value={formatINR(claimable)} />
        <Kpi
          label="GST credit at risk"
          value={formatINR(atRisk)}
          hint="Duplicates and missing GSTIN"
        />
        <Kpi
          label="Invoices flagged"
          value={String(rows.filter((r) => r.flags.length).length)}
          hint={`Company GSTIN ${COMPANY_GSTIN}`}
        />
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Booking</th>
              <th className="p-3">Booked</th>
              <th className="p-3">Invoiced</th>
              <th className="p-3">GST</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inv, flags }) => (
              <tr key={inv.id} className="border-t align-top">
                <td className="p-3">
                  <p className="font-semibold">{inv.vendor}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.type} · {inv.invoiceNo}
                  </p>
                </td>
                <td className="p-3">
                  {inv.tripId}
                  <p className="text-xs text-muted-foreground">{inv.bookingRef}</p>
                </td>
                <td className="p-3">{formatINR(inv.bookedINR)}</td>
                <td className="p-3">{formatINR(inv.invoicedINR)}</td>
                <td className="p-3">{formatINR(inv.gstINR)}</td>
                <td className="p-3">
                  {invoiceStatus[inv.id] === "reconciled" ? (
                    <Badge>Reconciled</Badge>
                  ) : (
                    <>
                      {flags.length ? (
                        flags.map((f) => (
                          <p key={f} className="text-xs font-semibold text-destructive">
                            {f}
                          </p>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-success">Matched</span>
                      )}
                      {invoiceStatus[inv.id] === "raised" && (
                        <Badge variant="secondary" className="mt-1">
                          Awaiting vendor
                        </Badge>
                      )}
                    </>
                  )}
                </td>
                <td className="p-3">
                  {invoiceStatus[inv.id] === "reconciled" ? null : invoiceStatus[inv.id] ===
                    "raised" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInvoiceStatus(inv.id, "reconciled");
                        toast.success("Corrected invoice received — reconciled");
                      }}
                    >
                      Mark corrected
                    </Button>
                  ) : flags.length ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRequesting({ inv, flags })}
                    >
                      Raise with vendor
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setInvoiceStatus(inv.id, "reconciled");
                        toast.success("Invoice reconciled");
                      }}
                    >
                      Mark reconciled
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {requesting && (
        <VendorRequestDialog
          key={requesting.inv.id}
          inv={requesting.inv}
          flags={requesting.flags}
          onClose={() => setRequesting(null)}
        />
      )}
    </>
  );
}

function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-sm">
            <span>{i.label}</span>
            <span className="font-semibold">{formatINR(i.value)}</span>
          </div>
          <Progress value={(i.value / max) * 100} className="mt-1" />
        </div>
      ))}
    </div>
  );
}

function Analytics() {
  const { trips, travellerPolicy } = useTrips();
  const byCity = new Map<string, number>();
  const byCat = new Map<string, number>();
  trips.forEach((t) =>
    t.expenses.forEach((e) => {
      byCity.set(t.city, (byCity.get(t.city) ?? 0) + e.amountINR);
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amountINR);
    }),
  );
  const selected = trips.filter((t) => t.selectedOptionId);
  const compliant = selected.filter((t) => {
    const o = t.options.find((x) => x.id === t.selectedOptionId);
    return o && !policyViolations(o, t.cityTier, travellerPolicy).length;
  }).length;
  const rate = selected.length ? Math.round((compliant / selected.length) * 100) : 100;
  const savings = trips.reduce((s, t) => {
    const costs = t.options.map((o) => o.costINR);
    const sel = t.options.find((o) => o.id === t.selectedOptionId);
    return s + (sel && costs.length ? Math.max(...costs) - sel.costINR : 0);
  }, 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Month spend" value={formatINR(monthSpend(trips))} />
        <Kpi
          label="Policy compliance rate"
          value={`${rate}%`}
          hint={`${compliant} of ${selected.length} booked trips`}
        />
        <Kpi
          label="Savings from agent optimisation"
          value={formatINR(savings)}
          hint="vs most expensive option"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <p className="mb-3 font-bold">By department</p>
          <Bars items={DEPARTMENT_SPEND.map((d) => ({ label: d.department, value: d.spendINR }))} />
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="mb-3 font-bold">By city</p>
          <Bars items={[...byCity].map(([label, value]) => ({ label, value }))} />
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="mb-3 font-bold">By category</p>
          <Bars items={[...byCat].map(([label, value]) => ({ label, value }))} />
        </div>
      </div>
    </>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function MapLoading() {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Loading traveller map…
    </div>
  );
}
