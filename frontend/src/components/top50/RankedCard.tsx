import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { SectorPill } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";
import { signalChips } from "../../lib/signalChips";
import type { Business } from "../../lib/types";

export function RankedCard({ business, rank }: { business: Business; rank: number }) {
  const [hovered, setHovered] = useState(false);
  const chips = signalChips(business);
  const age = new Date().getFullYear() - business.registry_year;

  return (
    <Link
      to={`/profiles/${business.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        "group relative flex flex-col rounded border bg-surface p-5 transition-all",
        rank <= 3 ? "border-forest/20 border-l-4 border-l-amber" : "border-forest/20",
        hovered && "-translate-y-0.5 shadow-lift"
      )}
    >
      <div className="flex items-start justify-between">
        <span className="font-display text-6xl italic leading-none text-forest/90">{rank}</span>
        <div className="text-right">
          <span className="block font-mono text-2xl font-medium text-amber">{business.hc_rank.toFixed(1)}</span>
          <span className="block font-mono text-[10px] uppercase tracking-wide text-text-muted">HC Score</span>
        </div>
      </div>

      <h3 className="mt-2 font-display text-xl font-bold text-text-primary">{business.name}</h3>
      <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-text-muted">
        <SectorPill sector={business.sector} />
        <span>Est. {business.registry_year} · {age} yrs</span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <ScoreBar label="Quality" value={business.quality} color="success" size="sm" />
        <ScoreBar label="Obscurity" value={business.obscurity} color="amber" size="sm" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-text-muted">
            {c}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1 font-mono text-xs text-terracotta">
        View Profile <ArrowRight size={12} />
      </div>

      {hovered && (
        <div className="absolute inset-0 flex flex-col justify-end rounded bg-forest/90 p-5 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-amber">Quick View</p>
          <ul className="flex flex-col gap-1">
            {chips.map((c) => (
              <li key={c} className="font-mono text-xs text-surface">
                {c}
              </li>
            ))}
            {chips.length === 0 && <li className="font-mono text-xs text-surface/60">No standout signals yet.</li>}
          </ul>
        </div>
      )}
    </Link>
  );
}
