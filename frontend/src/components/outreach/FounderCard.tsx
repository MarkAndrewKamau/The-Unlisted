import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import { GripVertical } from "lucide-react";
import type { Business, OutreachRecord, OutreachStatus } from "../../lib/types";

const STATUS_DOT: Record<OutreachStatus, string> = {
  identified: "bg-text-muted",
  contacted: "bg-amber",
  responded: "bg-amber",
  interviewed: "bg-success",
  joined: "bg-success",
  declined: "bg-terracotta",
};

export function FounderCard({
  record,
  business,
  rank,
  onClick,
}: {
  record: OutreachRecord;
  business: Business;
  rank: number;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.businessSlug,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={clsx(
        "mb-2 cursor-pointer rounded border border-forest/20 bg-surface p-3 shadow-subtle transition-shadow hover:shadow-lift",
        isDragging && "z-10 opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-text-muted">#{rank}</p>
          <h4 className="truncate font-display text-sm font-semibold text-text-primary">{business.name}</h4>
        </div>
        <button {...attributes} {...listeners} className="shrink-0 text-text-muted" aria-label="Drag">
          <GripVertical size={14} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">
          HC {business.hc_rank.toFixed(1)}
        </span>
        <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_DOT[record.status])} />
        {record.lastTouch && <span className="font-mono text-[10px] text-text-muted">{record.lastTouch}</span>}
      </div>
      <p className="mt-1.5 line-clamp-2 font-body text-xs text-text-muted">{record.notes || "No notes yet."}</p>
    </div>
  );
}
