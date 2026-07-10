export type Sector =
  | "ecommerce"
  | "manufacturing"
  | "agriculture"
  | "logistics";
export type Status = "active" | "disqualified";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}
export type OutreachStatus =
  | "identified"
  | "contacted"
  | "responded"
  | "interviewed"
  | "joined"
  | "declined";

export interface DimensionScore {
  name: string;
  weight: number;
  value: number; // 0..100
}

export interface FootprintRow {
  database: string;
  label: string;
  hit: boolean;
  hits: number;
  strong_excluder: boolean;
}

export interface Business {
  id: number;
  name: string;
  sector: Sector;
  town: string;
  source: string;
  website: string;
  registry_year: number | null;
  created_at: string;
  quality: number | null;
  obscurity: number | null;
  hc_rank: number | null;
  disqualified: boolean;
  manually_disqualified: boolean;
  verified: boolean;
  reason: string;
  dimensions: DimensionScore[];
  status?: Status;
}

export interface Investability {
  has_website: boolean;
  has_phone: boolean;
  contactability: number;
  website_live: boolean | null;
  https: boolean | null;
  domain_age_years: number | null;
  site_last_seen_days: number | null;
}

export interface BusinessDetail extends Business {
  signals: Record<string, number>;
  footprint: FootprintRow[];
  outreach: OutreachRecord | null;
  investability: Investability;
}

export interface OutreachRecord {
  business_id: number;
  status: OutreachStatus;
  notes: string;
  updated_at: string;
}

export interface OutreachEntry extends Business {
  outreach: OutreachRecord;
  founder: string | null;
}

export interface ActivityEvent {
  id: number;
  ts: string;
  message: string;
  tone: "info" | "success" | "disqualify";
}

export interface PipelineStats {
  seeded: number;
  scored: number;
  disqualified: number;
  top50: number;
  cycle: string;
  last_run: string | null;
  by_sector: Record<
    string,
    { seeded: number; scored: number; disqualified: number }
  >;
}

export interface DocSummary {
  slug: string;
  number: string;
  title: string;
}

export interface DocDetail extends DocSummary {
  body: string;
}

export type StageId =
  | "seed"
  | "enrich"
  | "places"
  | "footprint"
  | "score"
  | "profile"
  | "export"
  | "outreach";

export interface StageRunResult {
  stage: StageId;
  sector: string;
  lines: string[];
}
