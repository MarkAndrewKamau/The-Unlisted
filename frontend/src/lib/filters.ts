import type { Business, Sector } from "./types";

export type Status = "active" | "disqualified" | "pending";
export type FootprintBucket = "0" | "1-3" | "4-8" | "disqualified";

export interface CandidateFilters {
  sectors: Sector[];
  statuses: Status[];
  qualityRange: [number, number];
  obscurityRange: [number, number];
  footprintBuckets: FootprintBucket[];
  search: string;
}

export const DEFAULT_FILTERS: CandidateFilters = {
  sectors: [],
  statuses: [],
  qualityRange: [0, 100],
  obscurityRange: [0, 100],
  footprintBuckets: [],
  search: "",
};

function footprintBucketOf(b: Business): FootprintBucket {
  if (b.disqualified) return "disqualified";
  if (b.totalFootprintHits === 0) return "0";
  if (b.totalFootprintHits <= 3) return "1-3";
  return "4-8";
}

export function applyFilters(all: Business[], f: CandidateFilters): Business[] {
  return all.filter((b) => {
    if (f.sectors.length && !f.sectors.includes(b.sector)) return false;
    if (f.statuses.length && !f.statuses.includes(b.status)) return false;
    if (b.quality < f.qualityRange[0] || b.quality > f.qualityRange[1]) return false;
    if (b.obscurity < f.obscurityRange[0] || b.obscurity > f.obscurityRange[1]) return false;
    if (f.footprintBuckets.length && !f.footprintBuckets.includes(footprintBucketOf(b))) return false;
    if (f.search && !b.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
}

export function countActiveFilters(f: CandidateFilters): number {
  return (
    f.sectors.length +
    f.statuses.length +
    f.footprintBuckets.length +
    (f.qualityRange[0] > 0 || f.qualityRange[1] < 100 ? 1 : 0) +
    (f.obscurityRange[0] > 0 || f.obscurityRange[1] < 100 ? 1 : 0)
  );
}
