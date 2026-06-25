import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CheckCircle2, Download, Mail, Share2, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import { generateProfileMarkdown } from "../lib/profileTemplate";
import { exportProfileMarkdown } from "../lib/export";
import { Button } from "../components/ui/Button";
import { SectorPill } from "../components/ui/Badge";
import { InvestorSignals } from "../components/profile/InvestorSignals";
import { ScoreBreakdownChart } from "../components/profile/ScoreBreakdownChart";
import { ObscurityGauge } from "../components/ui/ObscurityGauge";
import { FootprintCheck } from "../components/shared/FootprintCheck";
import { SignalCoverage } from "../components/profile/SignalCoverage";
import { OutreachStatusBar } from "../components/profile/OutreachStatusBar";
import { InterviewScriptAccordion } from "../components/shared/InterviewScriptAccordion";
import { evidenceRows } from "../lib/evidence";

export function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const { businesses, outreach, verifiedSlugs, markVerified, disqualifiedSlugs, disqualifyManually, addActivity } = useApp();
  const [showDisqualifyConfirm, setShowDisqualifyConfirm] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [scriptOpen, setScriptOpen] = useState(false);

  const business = useMemo(() => businesses.find((b) => b.slug === slug), [businesses, slug]);
  // Rank within the real ranked, non-disqualified set.
  const rankInTop50 = useMemo(() => {
    const ranked = businesses
      .filter((b) => !b.disqualified)
      .sort((a, b) => b.hc_rank - a.hc_rank);
    const idx = ranked.findIndex((b) => b.slug === slug);
    return idx === -1 ? null : idx + 1;
  }, [businesses, slug]);

  if (!business) return <Navigate to="/candidates" replace />;

  const b = business;
  const isManuallyDisqualified = disqualifiedSlugs.has(b.slug);
  const isDisqualified = b.disqualified || isManuallyDisqualified;
  const isVerified = verifiedSlugs.has(b.slug) || (rankInTop50 !== null && rankInTop50 <= 50);
  const isTop10 = rankInTop50 !== null && rankInTop50 <= 10;
  const outreachRecord = isTop10 ? outreach.find((r) => r.businessSlug === b.slug) : undefined;
  const markdown = generateProfileMarkdown(b);

  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <div className="bg-forest px-6 py-8 md:px-10">
        <div className="flex items-start justify-between">
          <span className="font-display text-7xl italic text-amber/20 md:text-8xl">
            {rankInTop50 ?? "—"}
          </span>
          <div className="flex gap-2">
            <button className="rounded border border-surface/20 p-2 text-surface/70 hover:text-surface" aria-label="Share Profile">
              <Share2 size={15} />
            </button>
          </div>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold text-surface md:text-5xl">{b.name}</h1>
        <p className="mt-1 font-mono text-xs text-surface/60">{b.town} · {b.sector}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wide text-amber">Quality</div>
            <div className="font-mono text-lg text-surface">{b.quality.toFixed(1)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wide text-amber">Obscurity</div>
            <div className="font-mono text-lg text-surface">{b.obscurity.toFixed(1)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wide text-amber">HC Score</div>
            <div className="font-mono text-lg text-surface">{b.hc_rank.toFixed(1)}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isDisqualified ? (
            <span className="rounded border border-terracotta/40 bg-terracotta/15 px-2 py-1 font-mono text-[11px] text-terracotta">
              Disqualified
            </span>
          ) : (
            <span className="rounded border border-success/40 bg-success/15 px-2 py-1 font-mono text-[11px] text-success">
              {isVerified ? "Verified" : "Pending review"}
            </span>
          )}
          <SectorPill sector={b.sector} />
          {rankInTop50 && <span className="font-mono text-[11px] text-surface/60">Top 50 · #{rankInTop50}</span>}
        </div>
      </div>

      <div className="px-6 py-6 md:px-10">
        <h2 className="mb-1 inline-block border-b-2 border-amber pb-1 font-mono text-xs uppercase tracking-wide text-text-muted">
          Overview
        </h2>
        <blockquote className="mt-3 border-l-2 border-amber/40 pl-4 font-display text-lg italic text-text-primary">
          {b.signals.longevity_years} years quietly building in {b.town}, with almost no trace in the
          databases the startup ecosystem watches.
        </blockquote>
        <p className="mt-3 font-body text-sm leading-relaxed text-text-primary">
          {b.name} has operated since {b.registry_year}, earning a Quality score of {b.quality.toFixed(1)} within its{" "}
          {b.sector} cohort while registering {b.totalFootprintHits} ecosystem footprint hit
          {b.totalFootprintHits === 1 ? "" : "s"} across the common databases this pipeline checks.
        </p>
        <h3 className="mt-4 font-mono text-xs uppercase tracking-wide text-text-muted">What makes them exceptional</h3>
        <p className="mt-2 font-body text-sm leading-relaxed text-text-primary">
          Strong, evidence-backed fundamentals — longevity, customer satisfaction, and{" "}
          {b.signals.tenders_won > 0 ? "public tender wins" : "operational consistency"} — paired with near-total
          obscurity. <span className="bg-amber/20 px-1 font-medium text-text-primary">Founder background needs research</span>{" "}
          before publishing.
        </p>
      </div>

      <div className="px-6 py-6 md:px-10">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-text-muted">Score Breakdown</h2>
        <ScoreBreakdownChart business={b} />
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          <ObscurityGauge value={b.obscurity} />
          <div className="w-full flex-1">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-muted">Footprint table</p>
            <FootprintCheck business={b} />
          </div>
        </div>
      </div>

      <div className="px-6 pb-2 md:px-10">
        <InvestorSignals business={b} />
      </div>

      <div className="px-6 py-6 md:px-10">
        <h2 className="font-mono text-xs uppercase tracking-wide text-text-muted">Evidence Log</h2>
        <p className="mb-3 font-body text-sm italic text-text-muted">Every claim traces to a source.</p>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 text-left font-mono text-[11px] uppercase text-text-muted">Signal Type</th>
              <th className="py-1.5 text-left font-mono text-[11px] uppercase text-text-muted">Value</th>
              <th className="py-1.5 text-left font-mono text-[11px] uppercase text-text-muted">Source</th>
              <th className="py-1.5 text-left font-mono text-[11px] uppercase text-text-muted">Collected</th>
            </tr>
          </thead>
          <tbody>
            {evidenceRows(b).map((row, i) => (
              <tr key={row.type} className={i % 2 === 1 ? "bg-surface/40" : "bg-background"}>
                <td className="py-1.5 font-mono text-xs text-text-muted">{row.type}</td>
                <td className="py-1.5 font-mono text-xs text-text-primary">{row.value}</td>
                <td className="py-1.5 font-mono text-xs text-text-muted">{row.source}</td>
                <td className="py-1.5 font-mono text-xs text-text-muted">{row.capturedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 mb-2 font-mono text-[11px] uppercase tracking-wide text-text-muted">Signal coverage</p>
        <SignalCoverage business={b} />
      </div>

      {isTop10 && outreachRecord && (
        <div className="px-6 py-6 md:px-10">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-text-muted">Founder Outreach</h2>
          <OutreachStatusBar record={outreachRecord} />
          <button
            onClick={() => setScriptOpen((v) => !v)}
            className="mt-4 font-mono text-xs uppercase tracking-wide text-forest underline"
          >
            {scriptOpen ? "Hide" : "Show"} Interview Guide
          </button>
          {scriptOpen && (
            <div className="mt-3 rounded border border-border bg-surface p-4">
              <InterviewScriptAccordion />
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-0 left-0 right-0 flex flex-wrap gap-2 border-t border-border bg-background px-6 py-3 md:static md:px-10">
        <Button
          variant="outline"
          size="sm"
          icon={isVerified ? <CheckCircle2 size={13} /> : undefined}
          disabled={isVerified}
          onClick={() => {
            markVerified(b.slug);
            addActivity({ timestamp: new Date().toISOString().slice(11, 16), message: `Marked verified: ${b.name}`, tone: "success" });
          }}
        >
          {isVerified ? "Verified" : "Mark Verified"}
        </Button>
        <a href={`mailto:?subject=${encodeURIComponent(b.name + " — Hidden Champion profile")}&body=${encodeURIComponent(window.location.href)}`}>
          <Button size="sm" icon={<Mail size={13} />}>
            Send to Founder
          </Button>
        </a>
        <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => exportProfileMarkdown(b, markdown)}>
          Export Profile (.md)
        </Button>
        <Button size="sm" variant="danger" icon={<ShieldAlert size={13} />} onClick={() => setShowDisqualifyConfirm(true)} disabled={isDisqualified}>
          Disqualify
        </Button>
      </div>

      {showDisqualifyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4">
          <div className="w-full max-w-sm rounded border border-border bg-background p-5">
            <h3 className="font-display text-lg font-semibold text-text-primary">Disqualify {b.name}?</h3>
            <p className="mt-1 font-body text-sm text-text-muted">This removes it from the ranked deliverable. Provide a reason.</p>
            <textarea
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
              rows={3}
              placeholder="e.g. found a Crunchbase profile during manual review"
              className="mt-3 w-full rounded border border-border bg-surface p-2 font-body text-sm focus:border-forest focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDisqualifyConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!disqualifyReason.trim()}
                onClick={() => {
                  disqualifyManually(b.slug, disqualifyReason.trim());
                  setShowDisqualifyConfirm(false);
                }}
              >
                Confirm Disqualify
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
