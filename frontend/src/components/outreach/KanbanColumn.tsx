import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import type { ReactNode } from "react";

const COLUMN_TONE: Record<string, string> = {
  identified: "border-border",
  contacted: "border-amber/50",
  responded: "border-amber",
  interviewed: "border-success/50",
  joined: "border-success",
};

export function KanbanColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[200px] w-full flex-col rounded border bg-background p-3 md:w-72 md:shrink-0",
        COLUMN_TONE[id] ?? "border-border",
        isOver && "bg-surface"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-wide text-text-primary">{label}</h3>
        <span className="rounded-full bg-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">{count}</span>
      </div>
      <div className="flex-1">
        {count === 0 ? (
          <div className="rounded border border-dashed border-border p-4 text-center font-mono text-[11px] text-text-muted">
            No founders here yet
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
