import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getOutreach, patchOutreach } from "@/lib/api";
import type { OutreachEntry, OutreachStatus } from "@/lib/types";
import { Download, X } from "lucide-react";

export const Route = createFileRoute("/app/outreach")({
  head: () => ({ meta: [{ title: "Outreach · The Unlisted" }] }),
  component: OutreachPage,
});

const COLUMNS: { id: OutreachStatus; label: string }[] = [
  { id: "identified", label: "Identified" },
  { id: "contacted", label: "Contacted" },
  { id: "responded", label: "Responded" },
  { id: "interviewed", label: "Interviewed" },
  { id: "joined", label: "Joined / Declined" },
];

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function OutreachPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["outreach"], queryFn: getOutreach });
  const entries = data ?? [];
  const [active, setActive] = useState<OutreachEntry | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OutreachStatus }) =>
      patchOutreach(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id as OutreachStatus | undefined;
    if (!overId) return;
    updateStatus.mutate({ id: Number(e.active.id), status: overId });
  };

  function exportCsv() {
    const header = ["rank", "business", "sector", "hc_rank", "status", "last_touch", "notes"];
    const lines = [header.join(",")];
    entries.forEach((e, i) => {
      lines.push(
        [
          i + 1,
          `"${e.name}"`,
          e.sector,
          e.hc_rank,
          e.outreach.status,
          e.outreach.updated_at,
          `"${e.outreach.notes.replace(/"/g, "'")}"`,
        ].join(","),
      );
    });
    download("outreach_tracker.csv", lines.join("\n"));
  }

  return (
    <div className="p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">Top 10 · CRM</p>
          <h1 className="font-display text-4xl text-foreground">Founder outreach</h1>
          <p className="mt-2 text-foreground/70">Drag cards between columns to update outreach status.</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-forest"
        >
          <Download className="h-4 w-4" /> Export tracker CSV
        </button>
      </header>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 grid-cols-[repeat(5,minmax(240px,1fr))] overflow-x-auto pb-4">
          {COLUMNS.map((col, colIdx) => (
            <Column key={col.id} id={col.id} label={col.label}>
              {entries
                .filter((e) =>
                  col.id === "joined"
                    ? e.outreach.status === "joined" || e.outreach.status === "declined"
                    : e.outreach.status === col.id,
                )
                .map((e) => (
                  <DraggableCard
                    key={e.id}
                    entry={e}
                    rank={entries.findIndex((x) => x.id === e.id) + 1}
                    onOpen={() => setActive(e)}
                  />
                ))}
            </Column>
          ))}
        </div>
      </DndContext>

      {active && (
        <FounderDetail
          entry={active}
          rank={entries.findIndex((x) => x.id === active.id) + 1}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function Column({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[400px] bg-card transition-colors ${
        isOver ? "border-amber bg-amber/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DraggableCard({
  entry,
  rank,
  onOpen,
}: {
  entry: OutreachEntry;
  rank: number;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onOpen();
        }
      }}
      className={`rounded-lg border border-border bg-background p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          #{rank}
        </span>
        <span className="font-display text-lg text-forest">{entry.hc_rank}</span>
      </div>
      <div className="mt-1 font-medium text-sm">{entry.name}</div>
      <div className="mt-2 mono text-[10px] text-muted-foreground">
        Updated: {new Date(entry.outreach.updated_at).toLocaleDateString()}
      </div>
      {entry.outreach.notes && (
        <p className="mt-2 text-xs text-foreground/70 line-clamp-2">{entry.outreach.notes}</p>
      )}
    </div>
  );
}

const SCRIPT = [
  { title: "1. Opening", items: ["Introduce yourself and The Unlisted", "Explain the framing", "Get consent to record"] },
  { title: "2. The story", items: ["How did the business start?", "Who is the founder team?", "Key milestones"] },
  { title: "3. Business model", items: ["Who buys?", "Unit economics", "Margin structure"] },
  { title: "4. Verify signals", items: ["Walk through evidence log", "Correct anything wrong", "Fill gaps"] },
  { title: "5. The invitation", items: ["Explain recognition programme", "Ask permission to publish", "Next steps"] },
];

function FounderDetail({
  entry,
  rank,
  onClose,
}: {
  entry: OutreachEntry;
  rank: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(0);
  const saveNotes = useMutation({
    mutationFn: (notes: string) => patchOutreach(entry.id, { notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border-l border-border overflow-auto p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Founder outreach · #{rank}
            </p>
            <h3 className="font-display text-2xl mt-1">{entry.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Founder: {entry.founder ?? "needs research"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Notes
          </p>
          <textarea
            defaultValue={entry.outreach.notes}
            onBlur={(e) => saveNotes.mutate(e.target.value)}
            className="w-full min-h-[120px] rounded-md border border-border bg-background p-3 text-sm"
            placeholder="Add a contact note…"
          />
        </div>

        <div className="mt-6">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Interview script
          </p>
          <div className="space-y-2">
            {SCRIPT.map((sec, i) => (
              <div key={i} className="rounded-md border border-border">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex justify-between items-center px-3 py-2 text-sm font-medium"
                >
                  {sec.title}
                  <span className="text-muted-foreground">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && (
                  <ul className="px-3 pb-3 space-y-1">
                    {sec.items.map((q, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1 accent-forest" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
