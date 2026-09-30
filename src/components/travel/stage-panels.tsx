import { useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, ChevronRight, Clock3, Download, FileUp, RefreshCw, Star, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration, formatINR } from "@/lib/geo";
import { rankOptions, rebalance } from "@/lib/policy";
import { demoAction, useTrips } from "@/lib/store";
import type { Trip } from "@/lib/types";

export function StagePanel({ trip }: { trip: Trip }) {
  if (trip.stage === "discovery") return <DiscoveryPanel trip={trip} />;
  if (trip.stage === "planning") return <PlanningPanel trip={trip} />;
  if (trip.stage === "confirmed") return <ConfirmedPanel trip={trip} />;
  if (trip.stage === "live") return <LivePanel trip={trip} />;
  return <PostTripPanel trip={trip} />;
}

function PanelShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section className="rounded-md border bg-card p-5"><p className="text-xs font-bold uppercase text-primary">{eyebrow}</p><h3 className="mt-1 text-lg font-bold">{title}</h3><div className="mt-4">{children}</div></section>;
}

function DiscoveryPanel({ trip }: { trip: Trip }) {
  const { advanceStage, log } = useTrips();
  return <PanelShell eyebrow="Discovery Agent" title="Is this trip worth making?">
    <div className="grid gap-3 sm:grid-cols-2">
      <DataPoint label="Trigger" value={trip.discovery.trigger} wide />
      <DataPoint label="Business value" value={`${trip.discovery.businessValue}/100`} />
      <DataPoint label="Policy fit" value={trip.discovery.policyFit} />
      <DataPoint label="Conflicts" value={trip.discovery.conflicts.join(" · ") || "No conflicts detected"} wide />
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button onClick={() => { advanceStage(trip.id, "planning"); log(trip.id, "discovery", "Requirements approved and handed to Pre-Trip Agent", "approval"); toast.success("Trip need approved"); }}>Review requirements</Button>
      <Button variant="outline" onClick={() => demoAction("Alternative trip dates")}>View alternatives</Button>
      <Button variant="ghost" onClick={() => demoAction("Dismiss trip")}>Dismiss trip</Button>
    </div>
  </PanelShell>;
}

function PlanningPanel({ trip }: { trip: Trip }) {
  const { prefs, grades, setWeights, updateTrip, advanceStage, log, raiseException } = useTrips();
  const [compare, setCompare] = useState<string[]>([]);
  const ranked = useMemo(() => rankOptions(trip.options, trip.weights, trip.cityTier, prefs), [trip.options, trip.weights, trip.cityTier, prefs, grades]);
  const changeWeight = (key: keyof Trip["weights"], value: number) => setWeights(trip.id, rebalance(trip.weights, key, value));
  const approve = (optionId: string, label: string) => {
    const entry = ranked.find((r) => r.option.id === optionId);
    if (entry && entry.violations.length) {
      const compliant = ranked.filter((r) => !r.violations.length).map((r) => r.option.costINR);
      const policyCost = compliant.length ? Math.min(...compliant) : entry.option.costINR;
      raiseException({ tripId: trip.id, optionId, title: `${label}: ${entry.violations[0]}`, justification: `Riya chose '${label}' for ${trip.purpose.toLowerCase()} (${entry.option.comfort}/5 comfort, ${formatDuration(entry.option.doorToDoorMins)} door to door).`, policyCostINR: policyCost, requestedCostINR: entry.option.costINR, recommendation: `Reject: the best compliant option costs ${formatINR(policyCost)} and meets the agenda.`, agentRecommends: "reject" });
      updateTrip(trip.id, { lastAction: `'${label}' awaiting manager approval (policy exception)` });
      toast.warning("Outside policy — sent to your manager for approval");
      return;
    }
    updateTrip(trip.id, { selectedOptionId: optionId, stage: "confirmed", activeAgent: "pretrip", lastAction: `Approved ${label} · bookings being confirmed` });
    advanceStage(trip.id, "confirmed");
    log(trip.id, "pretrip", `Approved itinerary option '${label}'`, "approval");
    toast.success("Itinerary approved");
  };
  return <PanelShell eyebrow="Pre-Trip Agent" title="Ranked itinerary options">
    <div className="grid gap-3 rounded-md bg-muted/50 p-4 sm:grid-cols-3">
      {(["time", "comfort", "cost"] as const).map((key) => <div key={key}><div className="mb-2 flex justify-between text-xs font-semibold capitalize"><span>{key}</span><span>{trip.weights[key]}%</span></div><Slider aria-label={`${key} priority`} value={[trip.weights[key]]} max={80} step={5} onValueChange={(values) => changeWeight(key, values[0] ?? trip.weights[key])} /></div>)}
    </div>
    <div className="mt-4 space-y-3">{ranked.map(({ option, score, violations }, index) => <div key={option.id} className="rounded-md border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-xs font-bold text-muted-foreground">#{index + 1}</span><h4 className="font-bold">{option.label}</h4>{index === 0 && <Badge>Recommended</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{option.flight} · {option.hotel}</p></div><div className="text-right"><p className="text-lg font-bold">{formatINR(option.costINR)}</p><p className="text-xs text-muted-foreground">Agent score {score}</p></div></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{formatDuration(option.doorToDoorMins)} door to door</span><span>{option.comfort}/5 comfort</span><span>{option.policyScore}% policy score</span></div>{violations.length ? <div className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{violations.join(" · ")}</div> : <p className="mt-3 text-xs font-semibold text-success">Within policy</p>}<div className="mt-3 flex items-center justify-between"><label className="flex items-center gap-2 text-xs"><Checkbox checked={compare.includes(option.id)} onCheckedChange={(checked) => setCompare((current) => checked ? [...current.slice(0, 1), option.id] : current.filter((id) => id !== option.id))} />Compare</label><Button size="sm" onClick={() => approve(option.id, option.label)}>Approve option</Button></div></div>)}</div>
    {compare.length === 2 && <div className="mt-4 grid gap-3 rounded-md border border-primary/30 bg-accent/30 p-4 sm:grid-cols-2">{compare.map((id) => { const item = ranked.find((entry) => entry.option.id === id); return item ? <div key={id}><p className="font-bold">{item.option.label}</p><p className="mt-1 text-sm">{formatINR(item.option.costINR)} · {formatDuration(item.option.doorToDoorMins)} · {item.option.comfort}/5 comfort</p></div> : null; })}</div>}
  </PanelShell>;
}

function ConfirmedPanel({ trip }: { trip: Trip }) {
  return <PanelShell eyebrow="Pre-Trip Agent" title="Everything is confirmed"><div className="grid gap-3 sm:grid-cols-3">{trip.bookings.map((booking) => <DataPoint key={booking.id} label={booking.type} value={`${booking.ref} · ${booking.status}`} />)}</div><div className="mt-4 rounded-md bg-muted/50 p-4"><p className="text-sm font-semibold">Day-by-day timeline</p><div className="mt-3 space-y-3 text-sm"><TimelineItem text="06:15 · Leave for Bengaluru airport" /><TimelineItem text="08:45 · Airport pickup and hotel transfer" /><TimelineItem text="11:00 · Client meeting and working session" /><TimelineItem text="19:30 · Return transfer begins" /></div></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => demoAction("Add to calendar")}><CalendarPlus />Add to calendar</Button><Button variant="outline" onClick={() => demoAction("Download tickets")}><Download />Download tickets</Button></div></PanelShell>;
}

function LivePanel({ trip }: { trip: Trip }) {
  const { updateTrip, log, addDecision, addEscalation } = useTrips();
  const simulate = () => {
    if (trip.live.disrupted) { toast("Disruption already simulated"); return; }
    updateTrip(trip.id, { live: { flight: `${trip.live.flight} · delayed 2h`, cab: "Pickup moved by 2 hours", hotel: trip.live.hotel, disrupted: true }, lastAction: "Flight delay detected · recovery plan prepared" });
    log(trip.id, "live", "Moved cab pickup by 2 hours and drafted a note to the meeting organiser", "auto");
    if (trip.autonomy.live === "auto") {
      log(trip.id, "live", "Rebooked onto the best available flight automatically", "auto");
      toast.success("Live Agent rebooked automatically");
    } else {
      addDecision({ tripId: trip.id, agent: "live", title: "Approve rebooking after 2-hour delay", reasoning: "The current flight now misses the first meeting. A nearby departure preserves the agenda for ₹2,140 more.", confidence: 92, alternatives: ["Keep current flight and join first meeting remotely", "Move the meeting by two hours"] });
      addEscalation({ tripId: trip.id, kind: "sameday", title: "Same-day change: rebook after 2-hour delay", detail: `${trip.live.flight} delayed 2h. Traveller approval pending; desk to secure seats on the next departure.`, slaMins: 30 });
      toast.warning("Rebooking needs your approval");
    }
  };
  return <PanelShell eyebrow="Live Trip Agent" title="Your trip is being monitored"><div className="grid gap-3 sm:grid-cols-3"><Status label="Flight" value={trip.live.flight} alert={trip.live.disrupted} /><Status label="Cab" value={trip.live.cab} /><Status label="Hotel" value={trip.live.hotel} /></div>{trip.live.disrupted && <div className="mt-4 rounded-md border border-warning/50 bg-warning/10 p-4"><p className="font-semibold">Recovery plan ready</p><p className="mt-1 text-sm text-muted-foreground">Rebooking proposed, organiser note drafted, and cab pickup moved automatically.</p></div>}<Button className="mt-4" variant="outline" onClick={simulate}><RefreshCw />Simulate disruption</Button></PanelShell>;
}

function PostTripPanel({ trip }: { trip: Trip }) {
  const spent = trip.expenses.reduce((sum, expense) => sum + expense.amountINR, 0);
  const [feedback, setFeedback] = useState(0);
  return <PanelShell eyebrow="Post-Trip Agent" title="Close out this trip"><div className="grid gap-3 sm:grid-cols-3"><DataPoint label="Spend" value={`${formatINR(spent)} of ${formatINR(trip.budgetINR)}`} /><DataPoint label="Time saved" value="3h 40m" /><DataPoint label="Policy outcome" value="94% compliant" /></div><div className="mt-4 rounded-md bg-muted/50 p-4"><p className="font-semibold">Expense draft ready</p><p className="mt-1 text-sm text-muted-foreground">Bookings and card transactions have been matched. Two meal receipts still need review.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => demoAction("Receipt upload")}><FileUp />Upload receipts</Button></div><div className="mt-4"><Label>How was the trip?</Label><div className="mt-2 flex gap-1">{[1,2,3,4,5].map((rating) => <Button key={rating} size="icon" variant="ghost" aria-label={`${rating} stars`} onClick={() => setFeedback(rating)}><Star className={rating <= feedback ? "fill-warning text-warning" : "text-muted-foreground"} /></Button>)}</div>{feedback > 0 && <Textarea className="mt-2" placeholder="Optional feedback for future recommendations" />}</div></PanelShell>;
}

function DataPoint({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={`rounded-md bg-muted/50 p-3 ${wide ? "sm:col-span-2" : ""}`}><p className="text-xs font-semibold capitalize text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function TimelineItem({ text }: { text: string }) { return <div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><span>{text}</span></div>; }
function Status({ label, value, alert }: { label: string; value: string; alert?: boolean }) { return <div className="rounded-md border p-3"><div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">{alert ? <AlertTriangle className="size-4 text-warning" /> : <Check className="size-4 text-success" />}{label}</div><p className="mt-2 text-sm font-medium">{value}</p></div>; }
