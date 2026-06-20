import { useEffect, useState } from "react";
import clsx from "clsx";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPipelineStages, getSectorBreakdown } from "../../lib/pipeline";
import type { PipelineStageDef } from "../../lib/types";

const STAGE_ROUTE: Record<PipelineStageDef["id"], string> = {
  seed: "/candidates",
  dedupe: "/candidates",
  enrich: "/candidates",
  exclude: "/candidates",
  score: "/candidates",
  top50: "/top-50",
};

const MIN_WIDTH = 38;
const MAX_WIDTH = 100;

export function PipelineFunnel() {
  const navigate = useNavigate();
  const stages = getPipelineStages();
  const maxCount = stages[0].count;
  const [hovered, setHovered] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, []);

  const widthFor = (count: number) =>
    MIN_WIDTH + (count / maxCount) * (MAX_WIDTH - MIN_WIDTH);

  return (
    <div className="relative overflow-hidden rounded bg-panel-dark p-5">
      {/* flowing dots */}
      <div key={animKey} className="pointer-events-none absolute inset-x-0 top-12 flex justify-center gap-6">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-amber"
            style={{
              animation: "dot-flow 2.6s ease-in forwards",
              animationDelay: `${i * 0.5}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-1.5">
        {stages.map((stage) => {
          const width = widthFor(stage.count);
          const breakdown = getSectorBreakdown(stage.id);
          const isExclude = stage.id === "exclude";
          const isTop = stage.id === "top50";
          return (
            <button
              key={stage.id}
              onClick={() => navigate(STAGE_ROUTE[stage.id])}
              onMouseEnter={() => setHovered(stage.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ width: `${width}%` }}
              className={clsx(
                "group relative flex items-center justify-between rounded border px-3 py-2.5 text-left transition-all",
                isExclude
                  ? "border-terracotta/50 bg-terracotta/15"
                  : isTop
                  ? "border-amber bg-amber/90"
                  : "border-surface/15 bg-surface/[0.08]",
                hovered === stage.id && "scale-[1.02] shadow-lift"
              )}
            >
              <span
                className={clsx(
                  "flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide",
                  isTop ? "text-forest" : isExclude ? "text-terracotta" : "text-surface/80"
                )}
              >
                {isExclude && <Lock size={11} />}
                {stage.label}
              </span>
              <span
                className={clsx(
                  "font-mono text-sm font-medium",
                  isTop ? "text-forest" : isExclude ? "text-terracotta" : "text-surface"
                )}
              >
                {stage.count.toLocaleString()}
              </span>

              {hovered === stage.id && (
                <div className="absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded border border-border bg-background px-3 py-2 text-left shadow-lift">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                    {stage.label} · sector split
                  </p>
                  <div className="flex justify-between font-mono text-xs text-text-primary">
                    <span>E-commerce</span>
                    <span>{breakdown.ecommerce.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono text-xs text-text-primary">
                    <span>Manufacturing</span>
                    <span>{breakdown.manufacturing.toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 font-body text-[11px] text-text-muted">{stage.description}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
