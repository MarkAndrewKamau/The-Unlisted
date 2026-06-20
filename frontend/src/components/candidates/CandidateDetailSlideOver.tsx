import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, UserPlus } from "lucide-react";
import { SlideOver } from "../ui/SlideOver";
import { SectorPill, StatusBadge } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";
import { Button } from "../ui/Button";
import { FootprintCheck } from "../shared/FootprintCheck";
import { WEIGHTS, WEIGHT_LABELS } from "../../lib/constants";
import { evidenceRows } from "../../lib/evidence";
import { useApp } from "../../context/AppContext";
import type { Business } from "../../lib/types";

export function CandidateDetailSlideOver({
  business,
  onClose,
}: {
  business: Business | null;
  onClose: () => void;
}) {
  const { markVerified, verifiedSlugs, addActivity } = useApp();
  const [addedToOutreach, setAddedToOutreach] = useState(false);

  if (!business) return <SlideOver open={false} onClose={onClose}><div /></SlideOver>;

  const b = business;
  const isVerified = verifiedSlugs.has(b.slug);

  return (
    <SlideOver open={!!business} onClose={onClose}>
      <div className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <SectorPill sector={b.sector} />
          <StatusBadge status={b.status} />
        </div>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold text-text-primary">{b.name}</h2>
          <span className="font-mono text-3xl font-medium text-amber">{b.hc_rank.toFixed(1)}</span>
        </div>
        <p className="font-mono text-xs text-text-muted">{b.town} · since {b.registry_year}</p>

        <section className="mt-6">
          <h3 className="mb-3 border-b border-amber/40 pb-1 font-mono text-xs uppercase tracking-wide text-text-muted">
            Score Breakdown
          </h3>
          <div className="flex flex-col gap-2.5">
            {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((dim) => (
              <ScoreBar
                key={dim}
                label={`${WEIGHT_LABELS[dim]} (${Math.round(WEIGHTS[dim] * 100)}%)`}
                value={b.qualityContributions[dim]}
                max={Math.round(WEIGHTS[dim] * 100)}
                color="success"
                size="sm"
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 border-b border-amber/40 pb-1 font-mono text-xs uppercase tracking-wide text-text-muted">
            Evidence Log
          </h3>
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            <table className="w-full">
              <tbody>
                {evidenceRows(b).map((row) => (
                  <tr key={row.type} className="border-b border-border/60">
                    <td className="py-1.5 font-mono text-[11px] text-text-muted">{row.type}</td>
                    <td className="py-1.5 font-mono text-xs text-text-primary">{row.value}</td>
                    <td className="py-1.5 text-right font-mono text-[11px] text-text-muted">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 border-b border-amber/40 pb-1 font-mono text-xs uppercase tracking-wide text-text-muted">
            Footprint Check
          </h3>
          <FootprintCheck business={b} />
        </section>

        <section className="mt-6 flex flex-wrap gap-2">
          <Link to={`/profiles/${b.slug}`}>
            <Button size="sm">View Full Profile</Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            icon={isVerified ? <CheckCircle2 size={13} /> : undefined}
            disabled={isVerified}
            onClick={() => {
              markVerified(b.slug);
              addActivity({ timestamp: new Date().toISOString().slice(11, 16), message: `Marked for verification: ${b.name}`, tone: "default" });
            }}
          >
            {isVerified ? "Marked for verification" : "Mark for Verification"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<UserPlus size={13} />}
            disabled={addedToOutreach}
            onClick={() => setAddedToOutreach(true)}
          >
            {addedToOutreach ? "Added to outreach" : "Add to Outreach"}
          </Button>
        </section>
      </div>
    </SlideOver>
  );
}
