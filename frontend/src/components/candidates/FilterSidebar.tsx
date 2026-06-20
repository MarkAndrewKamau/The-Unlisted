import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  type CandidateFilters,
  type FootprintBucket,
  type Status,
} from "../../lib/filters";
import type { Sector } from "../../lib/types";

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 py-1 font-body text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#0F2419]"
      />
      {label}
    </label>
  );
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterSidebar({
  filters,
  onChange,
  className,
}: {
  filters: CandidateFilters;
  onChange: (f: CandidateFilters) => void;
  className?: string;
}) {
  const activeCount = countActiveFilters(filters);

  return (
    <div className={clsx("w-full shrink-0 bg-surface p-4 md:w-60", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-wide text-text-muted">Filters</h3>
        {activeCount > 0 && (
          <span className="rounded-full bg-amber px-1.5 py-0.5 font-mono text-[10px] text-forest">{activeCount}</span>
        )}
      </div>

      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Sector</p>
        {(["ecommerce", "manufacturing"] as Sector[]).map((s) => (
          <Checkbox
            key={s}
            checked={filters.sectors.includes(s)}
            onChange={() => onChange({ ...filters, sectors: toggle(filters.sectors, s) })}
            label={s === "ecommerce" ? "E-commerce" : "Manufacturing"}
          />
        ))}
      </div>

      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Status</p>
        {([
          ["active", "Active"],
          ["disqualified", "Disqualified"],
          ["pending", "Pending Verification"],
        ] as [Status, string][]).map(([s, label]) => (
          <Checkbox
            key={s}
            checked={filters.statuses.includes(s)}
            onChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
            label={label}
          />
        ))}
      </div>

      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Quality {filters.qualityRange[0]}–{filters.qualityRange[1]}
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.qualityRange[1]}
          onChange={(e) => onChange({ ...filters, qualityRange: [filters.qualityRange[0], Number(e.target.value)] })}
          className="w-full accent-[#2D6A4F]"
        />
      </div>

      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Obscurity {filters.obscurityRange[0]}–{filters.obscurityRange[1]}
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.obscurityRange[1]}
          onChange={(e) => onChange({ ...filters, obscurityRange: [filters.obscurityRange[0], Number(e.target.value)] })}
          className="w-full accent-[#E8A020]"
        />
      </div>

      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted">Footprint hits</p>
        {([
          ["0", "0"],
          ["1-3", "1–3"],
          ["4-8", "4–8"],
          ["disqualified", "Disqualified"],
        ] as [FootprintBucket, string][]).map(([b, label]) => (
          <Checkbox
            key={b}
            checked={filters.footprintBuckets.includes(b)}
            onChange={() => onChange({ ...filters, footprintBuckets: toggle(filters.footprintBuckets, b) })}
            label={label}
          />
        ))}
      </div>

      <Button variant="outline" size="sm" icon={<RotateCcw size={12} />} onClick={() => onChange(DEFAULT_FILTERS)}>
        Reset
      </Button>
    </div>
  );
}
