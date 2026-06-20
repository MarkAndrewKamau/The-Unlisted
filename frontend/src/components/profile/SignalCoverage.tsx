import { WEIGHT_LABELS, WEIGHTS } from "../../lib/constants";
import type { Business } from "../../lib/types";

export function SignalCoverage({ business }: { business: Business }) {
  const dims = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {dims.map((dim) => {
        const hasSignal = business.qualityBreakdown[dim] > 0;
        return (
          <div key={dim} className="flex flex-col items-center gap-1.5 rounded border border-border bg-background py-3">
            <span
              className={
                hasSignal
                  ? "h-3 w-3 rounded-full bg-amber"
                  : "h-3 w-3 rounded-full border border-dashed border-text-muted"
              }
            />
            <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
              {WEIGHT_LABELS[dim]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
