import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTrips } from "@/lib/store";
import { DOCUMENT_CHECKLIST, findPlace, type TimedAction } from "@/lib/trip-utils";
import { AGENTS, type Trip } from "@/lib/types";

const DONE_LABEL: Record<string, string> = {
  checkin: "Checked in",
  docs: "Documents ready",
  early: "Requested",
};

/** The call-to-action on a quick-action card; each action updates the trip and its activity log. */
export function QuickActionButton({ trip, action }: { trip: Trip; action: TimedAction }) {
  const { prefs, updateTrip, log, addEscalation } = useTrips();
  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const done = trip.doneActions?.includes(action.id) ?? false;
  const hotel = findPlace(trip, "hotel")?.name ?? "your hotel";
  const agent = AGENTS[trip.activeAgent].name;

  const markDone = () =>
    updateTrip(trip.id, (t) => ({ doneActions: [...(t.doneActions ?? []), action.id] }));

  const checkIn = () => {
    const flight = trip.bookings.find((b) => b.type === "flight");
    const seat =
      prefs.seat === "No preference"
        ? "seat auto-assigned"
        : `${prefs.seat.toLowerCase()} seat requested`;
    markDone();
    log(
      trip.id,
      trip.activeAgent,
      `Web check-in completed for ${flight?.title ?? "your flight"} · ${seat}`,
      "approval",
    );
    toast.success("Web check-in completed");
  };

  const requestEarlyCheckIn = () => {
    markDone();
    addEscalation({
      tripId: trip.id,
      kind: "assistance",
      title: `Early check-in at ${hotel}`,
      detail: `Traveller arrives before noon and asked ${hotel} for an early check-in. Desk to confirm a ready room with the hotel.`,
      slaMins: 120,
    });
    log(
      trip.id,
      trip.activeAgent,
      `Requested early check-in at ${hotel} · Travel Desk will confirm`,
      "approval",
    );
    toast.success("Request sent to the Travel Desk");
  };

  const completeChecklist = () => {
    markDone();
    log(
      trip.id,
      trip.activeAgent,
      "Document checklist completed · everything is packed",
      "approval",
    );
    toast.success("Document checklist complete");
    setOpen(false);
  };

  const requestChange = () => {
    const text = reason.trim();
    if (!text) return;
    // A booked trip needs the desk to amend reservations; earlier stages just get replanned.
    const needsDesk = trip.stage === "confirmed" || trip.stage === "live";
    if (needsDesk) {
      addEscalation({
        tripId: trip.id,
        kind: "change",
        title: `Plan change: ${text.length > 60 ? `${text.slice(0, 57)}…` : text}`,
        detail: text,
        slaMins: 60,
      });
    }
    log(
      trip.id,
      trip.activeAgent,
      needsDesk
        ? `Asked the Travel Desk to change the plan: “${text}”`
        : `Asked the ${agent} to reassess the plan: “${text}”`,
      "approval",
    );
    toast.success(
      needsDesk ? "Change request sent to the Travel Desk" : `${agent} is reassessing the plan`,
    );
    setReason("");
    setOpen(false);
  };

  if (done) {
    return (
      <Button className="mt-3" size="sm" variant="outline" disabled>
        <Check />
        {DONE_LABEL[action.id] ?? "Done"}
      </Button>
    );
  }

  const onClick =
    action.id === "checkin"
      ? checkIn
      : action.id === "early"
        ? requestEarlyCheckIn
        : () => setOpen(true);

  return (
    <>
      <Button className="mt-3" size="sm" variant="outline" onClick={onClick}>
        {action.cta}
      </Button>
      {action.id === "docs" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Document checklist</DialogTitle>
              <DialogDescription>
                Tick each item once it is packed for {trip.title}. {ticked.length} of{" "}
                {DOCUMENT_CHECKLIST.length} ready.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {DOCUMENT_CHECKLIST.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  <Checkbox
                    id={`doc-${index}`}
                    checked={ticked.includes(item)}
                    onCheckedChange={(checked) =>
                      setTicked((current) =>
                        checked ? [...current, item] : current.filter((x) => x !== item),
                      )
                    }
                  />
                  <Label htmlFor={`doc-${index}`}>{item}</Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                disabled={ticked.length < DOCUMENT_CHECKLIST.length}
                onClick={completeChecklist}
              >
                Mark all packed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {action.id === "change" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change this plan</DialogTitle>
              <DialogDescription>
                {trip.stage === "confirmed" || trip.stage === "live"
                  ? "Bookings are already made, so this goes to the Travel Desk to amend."
                  : `Tell the ${agent} what changed and it will reassess the itinerary.`}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. The client moved the meeting to 3 pm"
              aria-label="What needs to change"
            />
            <DialogFooter>
              <Button disabled={!reason.trim()} onClick={requestChange}>
                Send request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
