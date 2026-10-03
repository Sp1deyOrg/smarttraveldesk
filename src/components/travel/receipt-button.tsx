import { useRef, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Receipt } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;

type ReceiptButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  onPick: (receipt: Receipt) => void;
};

/** A button that opens the file picker for one receipt (image or PDF, up to 10 MB). */
export function ReceiptButton({ onPick, children, ...props }: ReceiptButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
            toast.error("Attach a photo or PDF of the receipt");
            return;
          }
          if (file.size > MAX_BYTES) {
            toast.error("Receipts must be under 10 MB");
            return;
          }
          onPick({ name: file.name, url: URL.createObjectURL(file) });
        }}
      />
      <Button type="button" {...props} onClick={() => input.current?.click()}>
        {children}
      </Button>
    </>
  );
}
