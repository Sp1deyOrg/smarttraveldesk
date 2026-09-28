import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/geo";
import { useTrips } from "@/lib/store";
import type { PolicyException } from "@/lib/types";
import { Kpi, SectionHeading, WorkspaceHeader } from "./workspace";

export function ManagerApp() {
  const { exceptions } = useTrips();
  const pending = exceptions.filter((x) => x.status === "pending");
  const decided = exceptions.filter((x) => x.status !== "pending");
  const overspend = pending.reduce((s, x) => s + x.requestedCostINR - x.policyCostINR, 0);
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader />
      <main className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Awaiting your approval" value={String(pending.length)} />
          <Kpi label="Cost above policy (pending)" value={formatINR(overspend)} />
          <Kpi label="Decided" value={String(decided.length)} />
        </div>
        <section>
          <SectionHeading eyebrow="Approvals inbox" title="Policy exceptions" />
          {pending.length ? (
            <div className="grid gap-4 lg:grid-cols-2">{pending.map((x) => <ExceptionCard key={x.id} x={x} />)}</div>
          ) : (
            <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">No exceptions waiting. Agents route only policy breaches here.</div>
          )}
        </section>
        {decided.length > 0 && (
          <section>
            <SectionHeading eyebrow="History" title="Decided exceptions" />
            <div className="space-y-2">{decided.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 text-sm">
                <span><strong>{x.tripId}</strong> · {x.title}</span>
                <span className="text-muted-foreground">{x.comment}</span>
                <Badge variant={x.status === "approved" ? "default" : "destructive"}>{x.status}</Badge>
              </div>
            ))}</div>
          </section>
        )}
      </main>
    </div>
  );
}

function ExceptionCard({ x }: { x: PolicyException }) {
  const { trips, decideException } = useTrips();
  const [comment, setComment] = useState("");
  const trip = trips.find((t) => t.id === x.tripId);
  const diff = x.requestedCostINR - x.policyCostINR;
  const decide = (status: "approved" | "rejected") => {
    decideException(x.id, status, comment.trim());
    toast.success(`Exception ${status}. Trip, desk queue and activity log updated.`);
  };
  return (
    <article className="rounded-md border bg-card p-5 shadow-sm">
      <p className="text-xs font-bold text-primary">Riya Sharma · {x.tripId} · {trip?.city}</p>
      <h3 className="mt-1 font-bold">{x.title}</h3>
      <p className="mt-3 text-sm"><span className="font-semibold">Justification: </span>{x.justification}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-md bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Policy</p>{formatINR(x.policyCostINR)}</div>
        <div className="rounded-md bg-muted/50 p-2"><p className="text-xs text-muted-foreground">Requested</p>{formatINR(x.requestedCostINR)}</div>
        <div className="rounded-md bg-destructive/10 p-2 text-destructive"><p className="text-xs">Difference</p>+{formatINR(diff)}</div>
      </div>
      <p className="mt-3 rounded-md bg-accent/40 p-3 text-sm"><span className="font-semibold">Agent recommends: </span>{x.recommendation}</p>
      <Textarea className="mt-3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (required)" aria-label="Manager comment" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button disabled={!comment.trim()} onClick={() => decide("approved")}>Approve</Button>
        <Button disabled={!comment.trim()} variant="outline" onClick={() => decide("rejected")}>Reject</Button>
      </div>
    </article>
  );
}
