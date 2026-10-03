import { Bot, CircleHelp, Plane, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTrips } from "@/lib/store";

export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { prefs, setPrefs } = useTrips();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Travel preferences</DialogTitle>
          <DialogDescription>
            Agents use these preferences when ranking options for Riya Sharma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <PrefSelect
            label="Seat"
            value={prefs.seat}
            options={["Aisle", "Window", "No preference"]}
            onChange={(seat) => setPrefs({ ...prefs, seat })}
          />
          <PrefSelect
            label="Time of day"
            value={prefs.timeOfDay}
            options={["Morning", "Afternoon", "Evening", "No preference"]}
            onChange={(timeOfDay) => setPrefs({ ...prefs, timeOfDay })}
          />
          <PrefSelect
            label="Meal"
            value={prefs.meal}
            options={["Vegetarian", "Vegan", "Non-vegetarian", "No meal"]}
            onChange={(meal) => setPrefs({ ...prefs, meal })}
          />
          <div className="space-y-2">
            <Label htmlFor="room-type">Room preference</Label>
            <Input
              id="room-type"
              value={prefs.roomType}
              onChange={(event) => setPrefs({ ...prefs, roomType: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="airlines">Preferred airlines</Label>
            <Input
              id="airlines"
              value={prefs.airlines.join(", ")}
              onChange={(event) =>
                setPrefs({
                  ...prefs,
                  airlines: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hotels">Preferred hotel chains</Label>
            <Input
              id="hotels"
              value={prefs.hotelChains.join(", ")}
              onChange={(event) =>
                setPrefs({
                  ...prefs,
                  hotelChains: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Save preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrefSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-md bg-accent text-accent-foreground">
            <CircleHelp className="size-5" />
          </div>
          <DialogTitle>About this prototype</DialogTitle>
          <DialogDescription>
            TravelFlow demonstrates how specialist agents can manage a corporate trip while the
            employee stays in control.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock
            icon={Sparkles}
            title="Working logic"
            items={[
              "AI trip extraction",
              "Option scoring",
              "Policy checks",
              "Distance calculation",
              "Expense matching",
              "Calendar and ticket downloads",
              "Receipt attachments (kept in this browser)",
            ]}
          />
          <InfoBlock
            icon={Bot}
            title="Simulated services"
            items={[
              "Flight and hotel bookings",
              "Live flight status",
              "Calendar and CRM data",
              "Phone, message and vendor email delivery",
            ]}
          />
        </div>
        <div className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
          <Plane className="size-4" />
          Single-traveller corporate travel for Riya Sharma · L4 Manager
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Sparkles;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-success">●</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
