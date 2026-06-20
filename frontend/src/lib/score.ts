// Direct port of discovery/score.py so the dashboard's numbers come from the
// same two-axis model as the real pipeline, not arbitrary mock numbers.
import {
  FOOTPRINT_DISQUALIFY,
  OBSCURITY_K,
  STRONG_EXCLUDERS,
  WEIGHTS,
} from "./constants";
import type { FootprintRow, QualityBreakdown, Signals } from "./types";

export function rawDimensions(sig: Signals): QualityBreakdown {
  const rating = sig.rating;
  const reviews = sig.review_count;
  const lastDays = sig.last_activity_days;
  return {
    longevity: sig.longevity_years,
    customer: (rating / 5.0) * Math.log1p(reviews),
    consistency: 1.0 / (1.0 + lastDays / 30.0),
    growth: sig.locations + sig.job_postings,
    revenue: sig.tenders_won + sig.locations,
    validation: Math.max(sig.certified, sig.association_member),
  };
}

function normalize(values: number[]): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi - lo < 1e-9) return values.map(() => 0.5);
  return values.map((v) => (v - lo) / (hi - lo));
}

export function obscurityFromHits(totalHits: number): number {
  return 100.0 / (1.0 + totalHits / OBSCURITY_K);
}

export interface ScoreInput {
  id: number;
  signals: Signals;
  footprint: FootprintRow[];
}

export interface ScoreResult {
  qualityBreakdown: QualityBreakdown;
  qualityContributions: QualityBreakdown;
  quality: number;
  obscurity: number;
  hc_rank: number;
  disqualified: boolean;
  disqualifyReason: string;
  totalFootprintHits: number;
}

// Scores an entire sector cohort at once, since Quality dimensions are
// min-max normalised *within the sector* — exactly like score_sector() in Python.
export function scoreCohort(items: ScoreInput[]): Map<number, ScoreResult> {
  const raws = items.map((i) => rawDimensions(i.signals));
  const dims = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];
  const normed: Record<string, number[]> = {};
  for (const dim of dims) {
    normed[dim] = normalize(raws.map((r) => r[dim]));
  }

  const results = new Map<number, ScoreResult>();
  items.forEach((item, i) => {
    const quality =
      100.0 *
      dims.reduce((sum, dim) => sum + WEIGHTS[dim] * normed[dim][i], 0);

    const totalHits = item.footprint.reduce((s, f) => s + f.hits, 0);
    const obscurity = obscurityFromHits(totalHits);

    const strongHit = item.footprint.find(
      (f) => f.hits > 0 && STRONG_EXCLUDERS.has(f.source)
    );
    let disqualified = false;
    let reason = "";
    if (strongHit) {
      const strongSources = item.footprint
        .filter((f) => f.hits > 0 && STRONG_EXCLUDERS.has(f.source))
        .map((f) => f.source)
        .sort();
      disqualified = true;
      reason = `listed in common database(s): ${strongSources.join(", ")}`;
    } else if (totalHits > FOOTPRINT_DISQUALIFY) {
      disqualified = true;
      reason = `ecosystem footprint too high (${totalHits} hits)`;
    }

    const hc = disqualified
      ? 0
      : Math.sqrt(Math.max(quality, 0) * Math.max(obscurity, 0));

    const contributions = dims.reduce((acc, dim) => {
      acc[dim] = Math.round(WEIGHTS[dim] * normed[dim][i] * 100 * 10) / 10;
      return acc;
    }, {} as QualityBreakdown);

    results.set(item.id, {
      qualityBreakdown: raws[i],
      qualityContributions: contributions,
      quality: Math.round(quality * 10) / 10,
      obscurity: Math.round(obscurity * 10) / 10,
      hc_rank: Math.round(hc * 10) / 10,
      disqualified,
      disqualifyReason: reason,
      totalFootprintHits: totalHits,
    });
  });
  return results;
}
