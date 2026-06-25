import { Activity, Clock, Globe, Phone, Star } from "lucide-react";
import type { Business } from "../../lib/types";

// Investor-relevant fundamentals from the enrich + places stages, with honest
// "unknown" states when a signal couldn't be collected.
function Tile({
  icon, label, value, note, known,
}: {
  icon: React.ReactNode; label: string; value: string; note?: string; known: boolean;
}) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-lg ${known ? "text-text-primary" : "text-text-muted/60 italic"}`}>
        {value}
      </div>
      {note && <div className="mt-0.5 font-mono text-[10px] text-text-muted">{note}</div>}
    </div>
  );
}

export function InvestorSignals({ business }: { business: Business }) {
  const inv = business.investability;
  const s = business.signals;

  // Survival: years of web presence (Wayback) or declared/registry years
  const years = inv?.domainAgeYears ?? (s.longevity_years > 0 ? s.longevity_years : null);
  const yearsNote = inv?.domainAgeYears != null ? "web presence (archive)" : s.longevity_years > 0 ? "declared" : undefined;

  // Customer demand: Google Maps rating × review volume
  const hasReviews = s.rating > 0 && s.review_count > 0;

  // Recency: newest review, else last site snapshot
  let recency = "Unknown";
  let recencyKnown = false;
  if (s.last_activity_days > 0) {
    recency = `~${s.last_activity_days}d ago`; recencyKnown = true;
  } else if (inv?.siteLastSeenDays != null) {
    recency = `~${inv.siteLastSeenDays}d ago`; recencyKnown = true;
  }

  // Reachability
  const channels = [inv?.hasWebsite && "website", inv?.hasPhone && "phone"].filter(Boolean) as string[];

  // Web verification
  const liveValue = inv?.websiteLive == null ? "No website" : inv.websiteLive ? "Live" : "Down";

  return (
    <section className="rounded border border-border bg-background p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold text-text-primary">Investor signals</h3>
        <span className="font-mono text-[10px] text-text-muted">pre-screening · not a DD substitute</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tile icon={<Clock size={12} />} label="Survival"
          value={years != null ? `${years} yrs` : "Unknown"} note={yearsNote} known={years != null} />
        <Tile icon={<Star size={12} />} label="Customer demand"
          value={hasReviews ? `${s.rating}★` : "No data"}
          note={hasReviews ? `${s.review_count.toLocaleString()} ratings` : "not on Maps / unrated"}
          known={hasReviews} />
        <Tile icon={<Activity size={12} />} label="Recent activity"
          value={recency} note={recencyKnown ? "newest signal" : undefined} known={recencyKnown} />
        <Tile icon={<Phone size={12} />} label="Reachable"
          value={channels.length ? channels.join(" + ") : "No contact"}
          note={inv ? `${inv.contactability}/3 channels` : undefined} known={channels.length > 0} />
        <Tile icon={<Globe size={12} />} label="Web presence"
          value={liveValue}
          note={inv?.https ? "HTTPS" : inv?.websiteLive ? "no HTTPS" : undefined}
          known={inv?.websiteLive === true} />
      </div>
    </section>
  );
}
