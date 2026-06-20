import { useState } from "react";
import { ChevronDown, Play, Settings } from "lucide-react";
import { Button } from "../ui/Button";
import { RunPipelineSlideOver } from "../pipeline/RunPipelineSlideOver";
import { useApp } from "../../context/AppContext";

const CYCLES = ["2026-Q2", "2026-Q1", "2025-Q4"];

export function Topbar() {
  const { cycle } = useApp();
  const [runOpen, setRunOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(cycle);
  const [cycleOpen, setCycleOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-forest/20 bg-forest px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="h-2 w-2 rounded-full bg-amber" />
        <span className="font-mono text-sm font-medium text-surface">THE UNLISTED</span>
      </div>

      <div className="relative hidden md:block">
        <button
          onClick={() => setCycleOpen((v) => !v)}
          className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-surface"
        >
          {selectedCycle}
          <ChevronDown size={12} />
        </button>
        {cycleOpen && (
          <div className="absolute left-0 mt-1 w-32 rounded border border-white/10 bg-forest shadow-lift">
            {CYCLES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCycle(c);
                  setCycleOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left font-mono text-xs text-surface/80 hover:bg-white/5"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" icon={<Play size={13} />} onClick={() => setRunOpen(true)}>
          Run Pipeline
        </Button>
        <button className="rounded border border-white/10 p-2 text-surface/70 hover:text-surface" aria-label="Settings">
          <Settings size={15} />
        </button>
      </div>

      <RunPipelineSlideOver open={runOpen} onClose={() => setRunOpen(false)} />
    </header>
  );
}
