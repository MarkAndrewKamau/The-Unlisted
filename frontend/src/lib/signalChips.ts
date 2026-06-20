import type { Business } from "./types";

export function signalChips(b: Business): string[] {
  const chips: string[] = [];
  if (b.signals.review_count > 0) {
    chips.push(`★ ${b.signals.rating.toFixed(1)} · ${b.signals.review_count.toLocaleString()} reviews`);
  }
  if (b.signals.association_member) {
    chips.push(b.sector === "manufacturing" ? "KAM Member" : "KEPSA Member");
  }
  if (b.signals.tenders_won > 0) {
    chips.push(`${b.signals.tenders_won} tender${b.signals.tenders_won > 1 ? "s" : ""} won`);
  }
  if (b.signals.certified && chips.length < 3) {
    chips.push("KEBS Certified");
  }
  if (b.signals.locations > 1 && chips.length < 3) {
    chips.push(`${b.signals.locations} locations`);
  }
  if (b.signals.job_postings > 0 && chips.length < 3) {
    chips.push(`${b.signals.job_postings} open roles`);
  }
  return chips.slice(0, 3);
}
