import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";
import { RunPipelineSlideOver } from "./RunPipelineSlideOver";
import type { SectorFilter, StageId } from "../../context/AppContext";

const STAGES: { id: StageId; label: string }[] = [
  { id: "seed", label: "Seed" },
  { id: "footprint", label: "Footprint" },
  { id: "score", label: "Score" },
  { id: "profile", label: "Profile" },
  { id: "export", label: "Export" },
  { id: "outreach", label: "Outreach" },
];

const COMPLETED: StageId[] = ["seed", "footprint", "score", "profile", "export", "outreach"];

const SECTORS: { id: SectorFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "manufacturing", label: "Manufacturing" },
];

export function StageControls() {
  const [openStage, setOpenStage] = useState<StageId | null>(null);
  const [sector, setSector] = useState<SectorFilter>("all");

  return (
    <div className="mt-4 rounded border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setOpenStage(s.id)}
            className="flex items-center gap-1.5 rounded border border-forest/20 bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-forest transition-colors hover:border-amber hover:text-amber"
          >
            {COMPLETED.includes(s.id) && <CheckCircle2 size={12} className="text-success" />}
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">Sector</span>
        <div className="inline-flex gap-1 rounded border border-border bg-background p-0.5">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSector(s.id)}
              className={clsx(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                sector === s.id ? "bg-forest text-amber" : "text-text-muted hover:text-text-primary"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <RunPipelineSlideOver
        open={openStage !== null}
        onClose={() => setOpenStage(null)}
        initialStage={openStage ?? "seed"}
      />
    </div>
  );
}
