// Transcribed verbatim from data/sample_businesses.json — the real fixtures
// the Python pipeline ships for `python run.py demo`. Used as anchors inside
// the larger synthetic cohort so Twiga Foods / Sendy still demonstrably trip
// the Obscurity gate in the UI, exactly as the bundled demo intends.
import type { Sector, Signals } from "./types";

export interface SeedRow {
  name: string;
  sector: Sector;
  town: string;
  website: string;
  registry_year: number;
  source: string;
  signals: Signals;
  footprint: Record<string, number>;
}

export const SAMPLE_SEED: SeedRow[] = [
  {
    name: "Kevian Kenya Ltd",
    sector: "manufacturing",
    town: "Thika",
    website: "kevian.co.ke",
    registry_year: 1992,
    source: "kam",
    signals: { longevity_years: 33, rating: 4.4, review_count: 210, last_activity_days: 9, locations: 2, job_postings: 4, tenders_won: 3, certified: 1, association_member: 1 },
    footprint: { "techcabal.com": 0, "crunchbase.com": 0, "linkedin.com": 1, "disrupt-africa.com": 0 },
  },
  {
    name: "Spice World Ltd",
    sector: "manufacturing",
    town: "Nairobi",
    website: "spiceworld.co.ke",
    registry_year: 2004,
    source: "kam",
    signals: { longevity_years: 21, rating: 4.6, review_count: 95, last_activity_days: 20, locations: 1, job_postings: 2, tenders_won: 1, certified: 1, association_member: 1 },
    footprint: { "techcabal.com": 0, "crunchbase.com": 0, "linkedin.com": 0, "disrupt-africa.com": 0 },
  },
  {
    name: "Githunguri Dairy",
    sector: "manufacturing",
    town: "Kiambu",
    website: "freshadairy.co.ke",
    registry_year: 2004,
    source: "tenders",
    signals: { longevity_years: 21, rating: 4.3, review_count: 320, last_activity_days: 5, locations: 6, job_postings: 7, tenders_won: 5, certified: 1, association_member: 1 },
    footprint: { "techcabal.com": 0, "crunchbase.com": 0, "linkedin.com": 1, "disrupt-africa.com": 0 },
  },
  {
    name: "Twiga Foods",
    sector: "manufacturing",
    town: "Nairobi",
    website: "twiga.com",
    registry_year: 2014,
    source: "tenders",
    signals: { longevity_years: 11, rating: 3.9, review_count: 140, last_activity_days: 3, locations: 4, job_postings: 12, tenders_won: 0, certified: 1, association_member: 1 },
    footprint: { "techcabal.com": 18, "crunchbase.com": 1, "linkedin.com": 1, "disrupt-africa.com": 9 },
  },
  {
    name: "Mombasa Hardware Online",
    sector: "ecommerce",
    town: "Mombasa",
    website: "",
    registry_year: 2016,
    source: "jumia",
    signals: { longevity_years: 9, rating: 4.7, review_count: 1820, last_activity_days: 1, locations: 1, job_postings: 1, tenders_won: 0, certified: 0, association_member: 0 },
    footprint: { "techcabal.com": 0, "crunchbase.com": 0, "linkedin.com": 0, "disrupt-africa.com": 0 },
  },
  {
    name: "Karen Organic Store",
    sector: "ecommerce",
    town: "Nairobi",
    website: "karenorganic.co.ke",
    registry_year: 2018,
    source: "jumia",
    signals: { longevity_years: 7, rating: 4.8, review_count: 640, last_activity_days: 2, locations: 2, job_postings: 3, tenders_won: 0, certified: 1, association_member: 0 },
    footprint: { "techcabal.com": 1, "crunchbase.com": 0, "linkedin.com": 0, "disrupt-africa.com": 0 },
  },
  {
    name: "Eldoret Agrovet Supplies",
    sector: "ecommerce",
    town: "Eldoret",
    website: "",
    registry_year: 2013,
    source: "jumia",
    signals: { longevity_years: 12, rating: 4.5, review_count: 410, last_activity_days: 4, locations: 3, job_postings: 2, tenders_won: 1, certified: 0, association_member: 0 },
    footprint: { "techcabal.com": 0, "crunchbase.com": 0, "linkedin.com": 0, "disrupt-africa.com": 0 },
  },
  {
    name: "Sendy",
    sector: "ecommerce",
    town: "Nairobi",
    website: "sendy.co.ke",
    registry_year: 2014,
    source: "sample",
    signals: { longevity_years: 11, rating: 3.6, review_count: 230, last_activity_days: 40, locations: 2, job_postings: 0, tenders_won: 0, certified: 0, association_member: 0 },
    footprint: { "techcabal.com": 25, "crunchbase.com": 1, "linkedin.com": 1, "disrupt-africa.com": 14 },
  },
];
