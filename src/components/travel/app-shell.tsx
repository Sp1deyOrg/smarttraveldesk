import { useState, type ReactNode } from "react";
import { CircleHelp, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrips } from "@/lib/store";
import type { Persona } from "@/lib/types";
import { AboutDialog } from "./employee-dialogs";
import { EmployeeApp } from "./employee-app";
import { DeskApp } from "./desk-app";
import { ManagerApp } from "./manager-app";

export const PERSONAS: Record<Persona, { label: string; who: string }> = {
  employee: { label: "Employee", who: "Riya Sharma · L4" },
  desk: { label: "Travel Desk", who: "Anita Rao" },
  manager: { label: "Manager", who: "Vikram Nair" },
};

/** Renders the screens for whichever persona is selected in the top bar. */
export function AppRoot() {
  const { persona } = useTrips();
  if (persona === "desk") return <DeskApp />;
  if (persona === "manager") return <ManagerApp />;
  return <EmployeeApp />;
}

export function PersonaSwitcher() {
  const { persona, setPersona } = useTrips();
  return (
    <Select value={persona} onValueChange={(v: Persona) => setPersona(v)}>
      <SelectTrigger className="w-[150px]" aria-label="Switch persona">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PERSONAS) as Persona[]).map((p) => (
          <SelectItem key={p} value={p}>{PERSONAS[p].label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Shared top bar for the Travel Desk and Manager workspaces. */
export function WorkspaceHeader({ children }: { children?: ReactNode }) {
  const { persona } = useTrips();
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="mr-auto flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Plane className="size-5 -rotate-12" />
          </div>
          <div>
            <p className="font-extrabold leading-none">TravelFlow</p>
            <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">
              {PERSONAS[persona].label} · {PERSONAS[persona].who}
            </p>
          </div>
        </div>
        {children}
        <Button variant="ghost" size="icon" onClick={() => setAboutOpen(true)} aria-label="About this prototype">
          <CircleHelp />
        </Button>
        <PersonaSwitcher />
      </div>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </header>
  );
}

export function SectionHeading({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-extrabold">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
