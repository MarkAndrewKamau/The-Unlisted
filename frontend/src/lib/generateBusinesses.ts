import { COMMON_DATABASES, STRONG_EXCLUDERS } from "./constants";
import { ecommerceName, founderName, manufacturingName, slugify, TOWNS } from "./names";
import { mulberry32, intBetween, floatBetween } from "./rng";
import { scoreCohort, type ScoreInput } from "./score";
import { SAMPLE_SEED } from "./sampleSeed";
import type { Business, FootprintRow, Sector, Signals } from "./types";

const SEED = 8821;
const CURRENT_YEAR = 2026;
const DOMAINS = Object.keys(COMMON_DATABASES);
const STRONG_DOMAINS = DOMAINS.filter((d) => STRONG_EXCLUDERS.has(d));
const SOFT_DOMAINS = DOMAINS.filter((d) => !STRONG_EXCLUDERS.has(d));

const SOURCES: Record<Sector, string[]> = {
  manufacturing: ["kam", "tenders", "kam", "tenders", "sample"],
  ecommerce: ["jumia", "jumia", "jumia", "sample"],
};

function genSignals(sector: Sector, rand: () => number): Signals {
  const longevity =
    sector === "manufacturing" ? intBetween(2, 38, rand) : intBetween(1, 14, rand);
  const rating = Math.round(floatBetween(3.0, 5.0, rand) * 10) / 10;
  const reviewCount = Math.round(Math.pow(rand(), 2) * (sector === "ecommerce" ? 2400 : 600));
  const lastActivityDays = Math.round(Math.pow(rand(), 1.8) * 220);
  const locations = intBetween(1, sector === "manufacturing" ? 7 : 4, rand);
  const jobPostings = intBetween(0, sector === "manufacturing" ? 14 : 6, rand);
  const tendersWon =
    sector === "manufacturing"
      ? (rand() < 0.55 ? intBetween(0, 8, rand) : 0)
      : (rand() < 0.08 ? intBetween(0, 2, rand) : 0);
  const certified = (sector === "manufacturing" ? rand() < 0.48 : rand() < 0.16) ? 1 : 0;
  const associationMember = (sector === "manufacturing" ? rand() < 0.42 : rand() < 0.1) ? 1 : 0;
  return {
    longevity_years: longevity,
    rating,
    review_count: reviewCount,
    last_activity_days: lastActivityDays,
    locations,
    job_postings: jobPostings,
    tenders_won: tendersWon,
    certified: certified as 0 | 1,
    association_member: associationMember as 0 | 1,
  };
}

function genFootprint(rand: () => number): FootprintRow[] {
  const roll = rand();
  const rows: FootprintRow[] = [];
  if (roll < 0.82) {
    // truly hidden — no presence at all
    return rows;
  }
  if (roll < 0.93) {
    // light footprint: a stray press/LinkedIn mention, not disqualifying on its own
    const nDomains = intBetween(1, 2, rand);
    const chosen = new Set<string>();
    while (chosen.size < nDomains) chosen.add(SOFT_DOMAINS[Math.floor(rand() * SOFT_DOMAINS.length)]);
    for (const d of chosen) {
      rows.push({ source: d, label: COMMON_DATABASES[d], hits: intBetween(1, 4, rand) });
    }
    return rows;
  }
  // heavy footprint: ecosystem already knows them — gate should disqualify
  const strongDomain = STRONG_DOMAINS[Math.floor(rand() * STRONG_DOMAINS.length)];
  rows.push({ source: strongDomain, label: COMMON_DATABASES[strongDomain], hits: intBetween(1, 6, rand) });
  const extraSoft = intBetween(1, 3, rand);
  const chosen = new Set<string>();
  while (chosen.size < extraSoft) chosen.add(SOFT_DOMAINS[Math.floor(rand() * SOFT_DOMAINS.length)]);
  for (const d of chosen) {
    rows.push({ source: d, label: COMMON_DATABASES[d], hits: intBetween(2, 20, rand) });
  }
  return rows;
}

function toFootprintRows(map: Record<string, number>): FootprintRow[] {
  return Object.entries(map)
    .filter(([, hits]) => hits > 0)
    .map(([source, hits]) => ({ source, label: COMMON_DATABASES[source] ?? source, hits }));
}

interface Draft {
  name: string;
  sector: Sector;
  town: string;
  website: string;
  registry_year: number;
  source: string;
  signals: Signals;
  footprint: FootprintRow[];
}

function buildDrafts(): Draft[] {
  const rand = mulberry32(SEED);
  const drafts: Draft[] = [];
  const usedNames = new Set<string>();

  for (const s of SAMPLE_SEED) {
    drafts.push({
      name: s.name,
      sector: s.sector,
      town: s.town,
      website: s.website,
      registry_year: s.registry_year,
      source: s.source,
      signals: s.signals,
      footprint: toFootprintRows(s.footprint),
    });
    usedNames.add(s.name);
  }

  const PER_SECTOR = 230;
  (["manufacturing", "ecommerce"] as Sector[]).forEach((sector) => {
    let made = 0;
    let attempts = 0;
    while (made < PER_SECTOR && attempts < PER_SECTOR * 8) {
      attempts++;
      const town = TOWNS[Math.floor(rand() * TOWNS.length)];
      const name = sector === "manufacturing" ? manufacturingName(town, rand) : ecommerceName(town, rand);
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      const signals = genSignals(sector, rand);
      const hasWebsite = rand() < (sector === "ecommerce" ? 0.55 : 0.3);
      drafts.push({
        name,
        sector,
        town,
        website: hasWebsite ? `${slugify(name)}.co.ke` : "",
        registry_year: CURRENT_YEAR - signals.longevity_years,
        source: SOURCES[sector][Math.floor(rand() * SOURCES[sector].length)],
        signals,
        footprint: genFootprint(rand),
      });
      made++;
    }
  });

  return drafts;
}

function computeAll(drafts: Draft[]): Business[] {
  const bySector: Record<Sector, Draft[]> = { manufacturing: [], ecommerce: [] };
  drafts.forEach((d) => bySector[d.sector].push(d));

  const businesses: Business[] = [];
  let nextId = 1;
  (["manufacturing", "ecommerce"] as Sector[]).forEach((sector) => {
    const cohort = bySector[sector];
    const ids = cohort.map((_, i) => i);
    const scoreInputs: ScoreInput[] = cohort.map((d, i) => ({
      id: ids[i],
      signals: d.signals,
      footprint: d.footprint,
    }));
    const results = scoreCohort(scoreInputs);
    cohort.forEach((d, i) => {
      const r = results.get(ids[i])!;
      const id = nextId++;
      businesses.push({
        id,
        slug: slugify(d.name) + "-" + id,
        name: d.name,
        sector: d.sector,
        town: d.town,
        website: d.website,
        source: d.source,
        registry_year: d.registry_year,
        signals: d.signals,
        footprint: d.footprint,
        totalFootprintHits: r.totalFootprintHits,
        quality: r.quality,
        qualityBreakdown: r.qualityBreakdown,
        qualityContributions: r.qualityContributions,
        obscurity: r.obscurity,
        hc_rank: r.hc_rank,
        disqualified: r.disqualified,
        disqualifyReason: r.disqualifyReason,
        status: r.disqualified ? "disqualified" : "active",
      });
    });
  });

  return businesses;
}

const REVIEWED_CUTOFF = 60; // top N active candidates human-reviewed ("VERIFY" funnel step)

function applyReviewStatus(businesses: Business[]): Business[] {
  const activeSorted = businesses
    .filter((b) => !b.disqualified)
    .sort((a, b) => b.hc_rank - a.hc_rank);
  const reviewedIds = new Set(activeSorted.slice(0, REVIEWED_CUTOFF).map((b) => b.id));
  return businesses.map((b) => {
    if (b.disqualified) return b;
    return { ...b, status: reviewedIds.has(b.id) ? "active" : "pending" };
  });
}

let _cache: Business[] | null = null;

export function getAllBusinesses(): Business[] {
  if (_cache) return _cache;
  const drafts = buildDrafts();
  _cache = applyReviewStatus(computeAll(drafts));
  return _cache;
}

export function getRankedActive(): Business[] {
  return getAllBusinesses()
    .filter((b) => !b.disqualified)
    .sort((a, b) => b.hc_rank - a.hc_rank);
}

export function getTop50(): Business[] {
  return getRankedActive().slice(0, 50);
}

export function getDisqualified(): Business[] {
  return getAllBusinesses().filter((b) => b.disqualified);
}

export { founderName };
