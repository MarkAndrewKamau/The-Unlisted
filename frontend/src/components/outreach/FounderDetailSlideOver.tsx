import { useState } from "react";
import { Mail } from "lucide-react";
import { SlideOver } from "../ui/SlideOver";
import { Button } from "../ui/Button";
import { SectorPill } from "../ui/Badge";
import { InterviewScriptAccordion } from "../shared/InterviewScriptAccordion";
import { useApp } from "../../context/AppContext";
import type { Business, OutreachRecord } from "../../lib/types";

export function FounderDetailSlideOver({
  record,
  business,
  onClose,
}: {
  record: OutreachRecord | null;
  business: Business | null;
  onClose: () => void;
}) {
  const { updateOutreachNotes } = useApp();
  const [notes, setNotes] = useState(record?.notes ?? "");

  if (!record || !business) return <SlideOver open={false} onClose={onClose}><div /></SlideOver>;

  return (
    <SlideOver open={!!record} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center gap-2">
          <SectorPill sector={business.sector} />
          <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[11px] text-amber">
            HC {business.hc_rank.toFixed(1)}
          </span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold text-text-primary">{business.name}</h2>
        <p className="font-mono text-xs text-text-muted">Founder: {record.founder}</p>

        <section className="mt-5">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-muted">Contact history</h3>
          <ul className="font-mono text-xs text-text-primary">
            <li>First contacted: {record.firstContacted ?? "—"}</li>
            <li>Last touch: {record.lastTouch ?? "—"}</li>
            <li>Channel: {record.contactChannel || "—"}</li>
            <li>Handle: {record.contactHandle || "—"}</li>
            <li>Owner: {record.owner || "—"}</li>
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-muted">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => updateOutreachNotes(record.businessSlug, notes)}
            rows={4}
            className="w-full rounded border border-border bg-surface p-2 font-body text-sm focus:border-forest focus:outline-none"
          />
        </section>

        <section className="mt-5">
          <a href={`mailto:?subject=${encodeURIComponent("The Unlisted — " + business.name)}`}>
            <Button size="sm" icon={<Mail size={13} />}>
              Send Email
            </Button>
          </a>
        </section>

        <section className="mt-6">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-muted">Interview Guide</h3>
          <InterviewScriptAccordion />
        </section>
      </div>
    </SlideOver>
  );
}
