import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { SectorPill, StatusBadge } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";
import type { Business } from "../../lib/types";

export type SortKey = "rank" | "name" | "quality" | "obscurity" | "hc_rank";

function Th({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={clsx(
        "cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-text-muted",
        align === "right" && "text-right"
      )}
    >
      <span className={clsx("inline-flex items-center gap-1", active && "text-forest")}>
        {label}
        {active && (dir === "desc" ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
      </span>
    </th>
  );
}

export function CandidateTable({
  rows,
  rankOffset,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: {
  rows: Business[];
  rankOffset: number;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  onRowClick: (b: Business) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b border-border">
            <Th label="Rank" sortKey="rank" active={sortKey === "rank"} dir={sortDir} onSort={onSort} />
            <Th label="Business" sortKey="name" active={sortKey === "name"} dir={sortDir} onSort={onSort} />
            <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Sector</th>
            <Th label="Quality" sortKey="quality" active={sortKey === "quality"} dir={sortDir} onSort={onSort} />
            <Th label="Obscurity" sortKey="obscurity" active={sortKey === "obscurity"} dir={sortDir} onSort={onSort} />
            <Th label="hc_rank" sortKey="hc_rank" active={sortKey === "hc_rank"} dir={sortDir} onSort={onSort} align="right" />
            <th className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr
              key={b.slug}
              onClick={() => onRowClick(b)}
              className={clsx(
                "cursor-pointer border-b border-border transition-colors hover:bg-surface/60",
                i % 2 === 1 && "bg-background/60",
                b.disqualified && "opacity-50"
              )}
            >
              <td className={clsx("px-3 py-2.5 font-mono text-sm text-amber", b.disqualified && "line-through")}>
                {b.disqualified ? "—" : rankOffset + i + 1}
              </td>
              <td className="px-3 py-2.5 font-display text-sm text-text-primary">{b.name}</td>
              <td className="px-3 py-2.5">
                <SectorPill sector={b.sector} />
              </td>
              <td className="px-3 py-2.5">
                <div className="w-28">
                  <ScoreBar value={b.quality} color="success" size="sm" />
                  <span className="mt-0.5 block font-mono text-[11px] text-text-muted">{b.quality.toFixed(1)}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="w-28">
                  <ScoreBar value={b.obscurity} color="amber" size="sm" />
                  <span className="mt-0.5 block font-mono text-[11px] text-text-muted">{b.obscurity.toFixed(1)}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-base font-medium text-amber">
                {b.hc_rank.toFixed(1)}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-10 text-center font-mono text-xs text-text-muted">No candidates match these filters.</div>
      )}
    </div>
  );
}
