import clsx from "clsx";
import { SectorPill, StatusBadge } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";
import type { Business } from "../../lib/types";

export function CandidateCardList({
  rows,
  rankOffset,
  onRowClick,
}: {
  rows: Business[];
  rankOffset: number;
  onRowClick: (b: Business) => void;
}) {
  if (rows.length === 0) {
    return <div className="p-8 text-center font-mono text-xs text-text-muted">No candidates match these filters.</div>;
  }

  return (
    <div className="flex flex-col gap-2.5 md:hidden">
      {rows.map((b, i) => (
        <button
          key={b.slug}
          onClick={() => onRowClick(b)}
          className={clsx(
            "rounded border border-border bg-background p-3.5 text-left",
            b.disqualified && "opacity-50"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={clsx("font-mono text-lg text-amber", b.disqualified && "line-through")}>
                {b.disqualified ? "—" : rankOffset + i + 1}
              </span>
              <h3 className="font-display text-base font-medium text-text-primary">{b.name}</h3>
            </div>
            <span className="shrink-0 font-mono text-lg font-medium text-forest">{b.hc_rank.toFixed(1)}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <SectorPill sector={b.sector} />
            <StatusBadge status={b.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ScoreBar label="Quality" value={b.quality} color="success" size="sm" />
            <ScoreBar label="Obscurity" value={b.obscurity} color="amber" size="sm" />
          </div>
        </button>
      ))}
    </div>
  );
}
