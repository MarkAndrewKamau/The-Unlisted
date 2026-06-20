import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle, Loader2, Play, X } from "lucide-react";
import { SlideOver } from "../ui/SlideOver";
import { Button } from "../ui/Button";
import { useApp, type SectorFilter, type StageId } from "../../context/AppContext";

const STAGES: { id: StageId; label: string }[] = [
  { id: "seed", label: "Seed" },
  { id: "footprint", label: "Footprint" },
  { id: "score", label: "Score" },
  { id: "profile", label: "Profile" },
  { id: "export", label: "Export" },
  { id: "outreach", label: "Outreach" },
];

const SECTORS: { id: SectorFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "manufacturing", label: "Manufacturing" },
];

export function RunPipelineSlideOver({
  open,
  onClose,
  initialStage = "seed",
}: {
  open: boolean;
  onClose: () => void;
  initialStage?: StageId;
}) {
  const { run, startRun, cancelRun } = useApp();
  const [stage, setStage] = useState<StageId>(initialStage);
  const [sector, setSector] = useState<SectorFilter>("all");
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setStage(initialStage);
  }, [open, initialStage]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [run.lines]);

  const isRunningThis = run.active && run.stage === stage;

  return (
    <SlideOver open={open} onClose={onClose} width="560px">
      <div className="flex h-full flex-col p-6">
        <h2 className="font-display text-2xl font-semibold text-forest">Run Pipeline</h2>
        <p className="mt-1 font-body text-sm text-text-muted">Stage selector → sector → execute.</p>

        <div className="mt-5 flex gap-1 rounded border border-border bg-surface p-1">
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className={clsx(
                "flex-1 rounded px-2 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors",
                stage === s.id ? "bg-forest text-amber" : "text-text-muted hover:text-text-primary"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Sector</div>
          <div className="inline-flex gap-1 rounded border border-border bg-surface p-1">
            {SECTORS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSector(s.id)}
                className={clsx(
                  "rounded px-3 py-1 font-mono text-xs transition-colors",
                  sector === s.id ? "bg-amber text-forest" : "text-text-muted hover:text-text-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={termRef}
          className="mt-5 flex-1 overflow-y-auto scrollbar-thin rounded border border-forest bg-forest p-4 font-mono text-xs text-surface"
          style={{ minHeight: "240px" }}
        >
          {run.lines.length === 0 && !isRunningThis && (
            <p className="text-surface/40">$ ready — press Run Now to execute this stage</p>
          )}
          {(run.stage === stage ? run.lines : []).map((line, i) => (
            <div key={i} className={clsx("py-0.5", line.startsWith("$") && "text-amber")}>
              {line}
            </div>
          ))}
          {isRunningThis && !run.done && (
            <div className="flex items-center gap-1.5 py-1 text-surface/60">
              <Loader2 size={12} className="animate-spin" /> running...
            </div>
          )}
        </div>

        {isRunningThis && run.done && (
          <div className="mt-3 flex items-center gap-2 rounded border border-success/40 bg-success/10 px-3 py-2 font-mono text-xs text-success">
            <CheckCircle size={14} /> Stage "{stage}" completed for sector: {sector}.
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!isRunningThis || run.done ? (
            <Button className="flex-1" icon={<Play size={14} />} onClick={() => startRun(stage, sector)}>
              Run Now
            </Button>
          ) : (
            <Button className="flex-1" variant="outline" icon={<X size={14} />} onClick={cancelRun}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </SlideOver>
  );
}
