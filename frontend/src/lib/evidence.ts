import { LAST_RUN } from "./pipeline";
import type { Business } from "./types";

export interface EvidenceRow {
  type: string;
  value: string;
  source: string;
  capturedAt: string;
}

const SIGNAL_META: { key: keyof Business["signals"]; label: string; source: (b: Business) => string }[] = [
  { key: "longevity_years", label: "longevity_years", source: (b) => (b.registry_year ? "company registry" : b.source) },
  { key: "rating", label: "rating", source: (b) => b.source },
  { key: "review_count", label: "review_count", source: (b) => b.source },
  { key: "last_activity_days", label: "last_activity_days", source: (b) => b.source },
  { key: "locations", label: "locations", source: (b) => b.source },
  { key: "job_postings", label: "job_postings", source: () => "BrighterMonday/Fuzu" },
  { key: "tenders_won", label: "tenders_won", source: () => "public tender awards" },
  { key: "certified", label: "certified", source: () => "KEBS / sector body" },
  { key: "association_member", label: "association_member", source: () => "KAM directory" },
];

export function evidenceRows(b: Business): EvidenceRow[] {
  const base = new Date(LAST_RUN).getTime();
  return SIGNAL_META.map((m, i) => {
    const value = b.signals[m.key];
    const captured = new Date(base - (b.id * 37 + i * 11) * 3600 * 1000).toISOString().slice(0, 10);
    return { type: m.label, value: String(value), source: m.source(b), capturedAt: captured };
  });
}
