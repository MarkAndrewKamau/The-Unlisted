import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { SectorPill } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";

export function LeaderboardPreview() {
  const { businesses } = useApp();
  const top5 = businesses
    .filter((b) => !b.disqualified)
    .sort((a, b) => b.hc_rank - a.hc_rank)
    .slice(0, 5);

  if (top5.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-6 text-center font-mono text-xs text-text-muted">
        No candidates scored yet — run the pipeline to populate rankings.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {top5.map((b, i) => (
        <Link
          key={b.slug}
          to={`/profiles/${b.slug}`}
          className="flex w-full min-w-0 items-center gap-3 rounded border border-forest/15 bg-surface px-3.5 py-3 transition-shadow hover:shadow-lift"
        >
          <span className="w-7 shrink-0 font-mono text-2xl font-medium text-amber">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 truncate font-display text-base font-medium text-text-primary">{b.name}</h3>
              <span className="shrink-0">
                <SectorPill sector={b.sector} />
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <ScoreBar label="Quality" value={b.quality} color="success" size="sm" />
              <ScoreBar label="Obscurity" value={b.obscurity} color="amber" size="sm" />
            </div>
          </div>
          <span className="shrink-0 font-mono text-xl font-medium text-forest">{b.hc_rank.toFixed(1)}</span>
        </Link>
      ))}
    </div>
  );
}
