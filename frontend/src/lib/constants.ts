// Mirrors discovery/footprint.py + discovery/score.py — the real exclusion +
// scoring constants from the Python pipeline, ported so mock data behaves
// identically to a live run.

export const COMMON_DATABASES: Record<string, string> = {
  "crunchbase.com": "Crunchbase (funding profiles)",
  "briterbridges.com": "Briter Bridges (Africa startup intelligence)",
  "vc4a.com": "VC4A (venture database)",
  "disrupt-africa.com": "Disrupt Africa (startup database + news)",
  "thebigdeal.com": "The Big Deal (African funding tracker)",
  "techcabal.com": "TechCabal",
  "techpoint.africa": "Techpoint Africa",
  "businessdailyafrica.com": "Business Daily (startup desk)",
  "linkedin.com": "LinkedIn (company page following)",
};

export const STRONG_EXCLUDERS = new Set([
  "crunchbase.com",
  "briterbridges.com",
  "vc4a.com",
  "thebigdeal.com",
]);

export const WEIGHTS = {
  longevity: 0.2,
  customer: 0.3,
  consistency: 0.15,
  growth: 0.15,
  revenue: 0.1,
  validation: 0.1,
} as const;

export const WEIGHT_LABELS: Record<keyof typeof WEIGHTS, string> = {
  longevity: "Longevity",
  customer: "Customer",
  consistency: "Consistency",
  growth: "Growth",
  revenue: "Revenue",
  validation: "Validation",
};

export const FOOTPRINT_DISQUALIFY = 8;
export const OBSCURITY_K = 2.0;
