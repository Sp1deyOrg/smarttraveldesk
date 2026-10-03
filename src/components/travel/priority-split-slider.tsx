import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { Weights } from "@/lib/types";
import { MIN_SEGMENT, moveDivider as nextWeights } from "@/lib/weights";

interface PrioritySplitSliderProps {
  value: Weights;
  onChange: (value: Weights) => void;
  label?: string;
}

export function PrioritySplitSlider({
  value,
  onChange,
  label = "Trip priorities",
}: PrioritySplitSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const moveDivider = useCallback(
    (divider: "time" | "cost", position: number) => onChange(nextWeights(value, divider, position)),
    [onChange, value],
  );

  const moveFromPointer = (divider: "time" | "cost", event: PointerEvent<HTMLButtonElement>) => {
    const track = trackRef.current;
    if (!track) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = track.getBoundingClientRect();
    const position = Math.round(((event.clientX - bounds.left) / bounds.width) * 100);
    moveDivider(divider, position);
  };

  const moveFromKeyboard = (divider: "time" | "cost", event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    const current = divider === "time" ? value.time : value.time + value.comfort;
    const minimum = divider === "time" ? MIN_SEGMENT : value.time + MIN_SEGMENT;
    const maximum = divider === "time" ? 100 - value.cost - MIN_SEGMENT : 100 - MIN_SEGMENT;
    if (event.key === "Home") moveDivider(divider, minimum);
    else if (event.key === "End") moveDivider(divider, maximum);
    else
      moveDivider(
        divider,
        current + (["ArrowRight", "ArrowUp"].includes(event.key) ? step : -step),
      );
  };

  return (
    <fieldset className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-medium">{label}</legend>
        <span className="text-xs text-muted-foreground">Always totals 100%</span>
      </div>
      <div
        ref={trackRef}
        className="relative flex h-14 w-full overflow-visible rounded-md border bg-muted shadow-sm"
        aria-label={`${label}: Time ${value.time}%, Comfort ${value.comfort}%, Cost ${value.cost}%`}
      >
        <PrioritySegment
          label="Time"
          value={value.time}
          className="rounded-l-[5px] bg-primary text-primary-foreground"
        />
        <PrioritySegment
          label="Comfort"
          value={value.comfort}
          className="bg-accent text-accent-foreground"
        />
        <PrioritySegment
          label="Cost"
          value={value.cost}
          className="rounded-r-[5px] bg-warning text-warning-foreground"
        />
        <Divider
          label="Time and comfort divider"
          value={value.time}
          valueText={`Time ${value.time}%, comfort ${value.comfort}%`}
          min={MIN_SEGMENT}
          max={100 - value.cost - MIN_SEGMENT}
          position={value.time}
          onPointerMove={(event) => moveFromPointer("time", event)}
          onKeyDown={(event) => moveFromKeyboard("time", event)}
        />
        <Divider
          label="Comfort and cost divider"
          value={value.time + value.comfort}
          valueText={`Comfort ${value.comfort}%, cost ${value.cost}%`}
          min={value.time + MIN_SEGMENT}
          max={100 - MIN_SEGMENT}
          position={value.time + value.comfort}
          onPointerMove={(event) => moveFromPointer("cost", event)}
          onKeyDown={(event) => moveFromKeyboard("cost", event)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Drag either divider, or focus it and use the arrow keys. Hold Shift for 5% steps.
      </p>
    </fieldset>
  );
}

function PrioritySegment({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`grid min-w-0 place-items-center transition-[width] ${className}`}
      style={{ width: `${value}%` }}
    >
      <span className="truncate px-1 text-center text-[11px] font-bold leading-tight sm:text-xs">
        {label}
        <span className="block">{value}%</span>
      </span>
    </div>
  );
}

function Divider({
  label,
  value,
  valueText,
  min,
  max,
  position,
  onPointerMove,
  onKeyDown,
}: {
  label: string;
  value: number;
  valueText: string;
  min: number;
  max: number;
  position: number;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className="absolute top-1/2 z-10 grid h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none place-items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ left: `${position}%` }}
      onPointerDown={onPointerMove}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) onPointerMove(event);
      }}
      onKeyDown={onKeyDown}
    >
      <span
        className="h-8 w-1 rounded-full bg-background shadow-[0_0_0_1px_var(--color-border)]"
        aria-hidden="true"
      />
    </button>
  );
}
