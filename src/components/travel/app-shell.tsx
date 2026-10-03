import { useTrips } from "@/lib/store";
import { EmployeeApp } from "./employee-app";
import { DeskApp } from "./desk-app";
import { ManagerApp } from "./manager-app";

/** Renders the screens for whichever persona is selected in the top bar. */
export function AppRoot() {
  const { persona } = useTrips();
  if (persona === "desk") return <DeskApp />;
  if (persona === "manager") return <ManagerApp />;
  return <EmployeeApp />;
}
