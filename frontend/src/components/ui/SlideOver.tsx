import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

export function SlideOver({
  open,
  onClose,
  width = "480px",
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-forest/40" onClick={onClose} />
      <div
        className="relative h-full overflow-y-auto scrollbar-thin bg-background shadow-lift animate-slide-in-right"
        style={{ width, maxWidth: "100vw" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded border border-border bg-background p-1.5 text-text-muted hover:text-text-primary"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
