import { Activity, Clock, Globe, Phone, Star } from "lucide-react";
import type { BusinessDetail } from "@/lib/types";

function Tile({
  icon,
  label,
  value,
  note,
  known,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  known: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-display text-lg ${known ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
        {value}
      </div>
      {note && <div className="mt-0.5 mono text-[10px] text-muted-foreground">{note}</div>}
    </div>
  );
}

export function InvestorSignals({ business }: { business: BusinessDetail }) {
  const inv = business.investability;
  const s = business.signals;

  // Survival: years of web presence (Wayback) or declared/registry years
  const declaredYears = s.longevity_years ?? 0;
  const years = inv?.domain_age_years ?? (declaredYears > 0 ? declaredYears : null);
  const yearsNote =
    inv?.domain_age_years != null ? "web presence (archive)" : declaredYears > 0 ? "declared" : undefined;

  // Customer demand: Google Maps rating × review volume
  const rating = s.rating ?? 0;
  const reviewCount = s.review_count ?? 0;
  const hasReviews = rating > 0 && reviewCount > 0;

  // Recency: newest review, else last site snapshot
  const lastActivityDays = s.last_activity_days ?? 0;
  let recency = "Unknown";
  let recencyKnown = false;
  if (lastActivityDays > 0) {
    recency = `~${lastActivityDays}d ago`;
    recencyKnown = true;
  } else if (inv?.site_last_seen_days != null) {
    recency = `~${inv.site_last_seen_days}d ago`;
    recencyKnown = true;
  }

  // Reachability
  const channels = [inv?.has_website && "website", inv?.has_phone && "phone"].filter(Boolean) as string[];

  // Web verification
  const liveValue = inv?.website_live == null ? "No website" : inv.website_live ? "Live" : "Down";

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-xl">Investor signals</h3>
        <span className="mono text-[10px] text-muted-foreground">pre-screening · not a DD substitute</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tile
          icon={<Clock className="h-3 w-3" />}
          label="Survival"
          value={years != null ? `${years} yrs` : "Unknown"}
          note={yearsNote}
          known={years != null}
        />
        <Tile
          icon={<Star className="h-3 w-3" />}
          label="Customer demand"
          value={hasReviews ? `${rating}★` : "No data"}
          note={hasReviews ? `${reviewCount.toLocaleString()} ratings` : "not on Maps / unrated"}
          known={hasReviews}
        />
        <Tile
          icon={<Activity className="h-3 w-3" />}
          label="Recent activity"
          value={recency}
          note={recencyKnown ? "newest signal" : undefined}
          known={recencyKnown}
        />
        <Tile
          icon={<Phone className="h-3 w-3" />}
          label="Reachable"
          value={channels.length ? channels.join(" + ") : "No contact"}
          note={inv ? `${inv.contactability}/3 channels` : undefined}
          known={channels.length > 0}
        />
        <Tile
          icon={<Globe className="h-3 w-3" />}
          label="Web presence"
          value={liveValue}
          note={inv?.https ? "HTTPS" : inv?.website_live ? "no HTTPS" : undefined}
          known={inv?.website_live === true}
        />
      </div>
    </section>
  );
}
