import { useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Download } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getTop50 } from "../lib/generateBusinesses";
import { KanbanColumn } from "../components/outreach/KanbanColumn";
import { FounderCard } from "../components/outreach/FounderCard";
import { FounderDetailSlideOver } from "../components/outreach/FounderDetailSlideOver";
import { InterviewScriptAccordion } from "../components/shared/InterviewScriptAccordion";
import { Button } from "../components/ui/Button";
import { OUTREACH_COLUMNS } from "../lib/outreach";
import type { OutreachStatus } from "../lib/types";

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Outreach() {
  const { outreach, updateOutreachStatus } = useApp();
  const top10 = getTop50().slice(0, 10);
  const businessBySlug = new Map(top10.map((b) => [b.slug, b]));
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selectedRecord = outreach.find((r) => r.businessSlug === selectedSlug) ?? null;
  const selectedBusiness = selectedSlug ? businessBySlug.get(selectedSlug) ?? null : null;

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const status = over.id as OutreachStatus;
    if (OUTREACH_COLUMNS.some((c) => c.id === status)) {
      updateOutreachStatus(active.id as string, status);
    }
  }

  function exportCsv() {
    const header = ["rank", "business", "sector", "hc_rank", "founder", "status", "last_touch", "owner", "notes"];
    const lines = [header.join(",")];
    outreach.forEach((r, i) => {
      const b = businessBySlug.get(r.businessSlug);
      if (!b) return;
      lines.push(
        [i + 1, `"${b.name}"`, b.sector, b.hc_rank, `"${r.founder}"`, r.status, r.lastTouch ?? "", r.owner, `"${r.notes.replace(/"/g, "'")}"`].join(",")
      );
    });
    download("outreach_tracker.csv", lines.join("\n"));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Founder Outreach</h1>
          <p className="font-body text-sm text-text-muted">Top 10 hidden champions · relationship pipeline</p>
        </div>
        <Button size="sm" icon={<Download size={13} />} onClick={exportCsv}>
          Export Tracker CSV
        </Button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3 overflow-x-auto pb-2 md:flex-row">
          {OUTREACH_COLUMNS.map((col) => {
            const records = outreach.filter((r) =>
              col.id === "joined" ? r.status === "joined" || r.status === "declined" : r.status === col.id
            );
            return (
              <KanbanColumn key={col.id} id={col.id} label={col.label} count={records.length}>
                {records.map((r) => {
                  const b = businessBySlug.get(r.businessSlug);
                  if (!b) return null;
                  const rank = top10.findIndex((t) => t.slug === r.businessSlug) + 1;
                  return (
                    <FounderCard
                      key={r.businessSlug}
                      record={r}
                      business={b}
                      rank={rank}
                      onClick={() => setSelectedSlug(r.businessSlug)}
                    />
                  );
                })}
              </KanbanColumn>
            );
          })}
        </div>
      </DndContext>

      <div className="mt-10 rounded border border-border bg-surface p-5">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-text-muted">Interview Script</h2>
        <InterviewScriptAccordion />
      </div>

      <FounderDetailSlideOver record={selectedRecord} business={selectedBusiness} onClose={() => setSelectedSlug(null)} />
    </div>
  );
}
