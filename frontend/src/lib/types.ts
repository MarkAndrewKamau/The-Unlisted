// Open string — real OSM sectors are manufacturing, retail, food, services,
// agriculture, … (and "ecommerce" in the mock/demo data). Kept as `string` so
// new sectors never break typing or exhaustive Record literals.
export type Sector = string;

export interface Signals {
  longevity_years: number;
  rating: number;
  review_count: number;
  last_activity_days: number;
  locations: number;
  job_postings: number;
  tenders_won: number;
  certified: 0 | 1;
  association_member: 0 | 1;
}

export interface FootprintRow {
  source: string;
  label: string;
  hits: number;
}

export interface QualityBreakdown {
  longevity: number;
  customer: number;
  consistency: number;
  growth: number;
  revenue: number;
  validation: number;
}

export type OutreachStatus =
  | "identified"
  | "contacted"
  | "responded"
  | "interviewed"
  | "joined"
  | "declined";

export interface Business {
  id: number;
  slug: string;
  name: string;
  sector: Sector;
  town: string;
  website: string;
  source: string;
  registry_year: number;
  signals: Signals;
  footprint: FootprintRow[];
  totalFootprintHits: number;
  quality: number;
  qualityBreakdown: QualityBreakdown;
  qualityContributions: QualityBreakdown;
  obscurity: number;
  hc_rank: number;
  disqualified: boolean;
  disqualifyReason: string;
  status: "active" | "disqualified" | "pending";
}

export interface OutreachRecord {
  businessSlug: string;
  founder: string;
  contactChannel: string;
  contactHandle: string;
  status: OutreachStatus;
  firstContacted: string | null;
  lastTouch: string | null;
  owner: string;
  notes: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  message: string;
  tone: "default" | "disqualify" | "success";
}

export interface PipelineStageDef {
  id: "seed" | "dedupe" | "enrich" | "exclude" | "score" | "top50";
  label: string;
  count: number;
  description: string;
}
