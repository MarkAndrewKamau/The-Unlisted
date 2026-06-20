import { getAllBusinesses, getDisqualified, getTop50 } from "./generateBusinesses";
import type { ActivityEvent, Business, PipelineStageDef } from "./types";

export const CYCLE = "2026-Q2";
export const LAST_RUN = "2026-06-18T14:32:00Z";

export function getPipelineStages(): PipelineStageDef[] {
  const all = getAllBusinesses();
  const enriched = all.length; // every record here has full signal coverage
  const excluded = getDisqualified().length;
  const scored = enriched - excluded;
  const top50 = getTop50().length;

  // Decorative upstream counts — funnel narrows before our "enriched" snapshot,
  // mirroring duplicate listings across sources and dropped/incomplete records.
  const deduped = Math.round(enriched * 1.06);
  const seeded = Math.round(deduped * 1.23);

  return [
    {
      id: "seed",
      label: "SEED",
      count: seeded,
      description: "Cast wide across free public sources — registries, directories, marketplaces, maps.",
    },
    {
      id: "dedupe",
      label: "DEDUPE",
      count: deduped,
      description: "Collapse the same business across sources into one candidate.",
    },
    {
      id: "enrich",
      label: "ENRICH",
      count: enriched,
      description: "Attach fundamentals signals per candidate — longevity, ratings, locations, tenders.",
    },
    {
      id: "exclude",
      label: "EXCLUDE",
      count: excluded,
      description: "Gate out anything already found in the common databases the ecosystem watches.",
    },
    {
      id: "score",
      label: "SCORE",
      count: scored,
      description: "Two-axis model: Quality × Obscurity (geometric mean), sector-normalised.",
    },
    {
      id: "top50",
      label: "TOP 50",
      count: top50,
      description: "Human-reviewed finalists: strong fundamentals, genuinely unknown.",
    },
  ];
}

export function getSectorBreakdown(stageId: PipelineStageDef["id"]) {
  const all = getAllBusinesses();
  let pool: Business[];
  switch (stageId) {
    case "exclude":
      pool = getDisqualified();
      break;
    case "score":
      pool = all.filter((b) => !b.disqualified);
      break;
    case "top50":
      pool = getTop50();
      break;
    default:
      pool = all;
  }
  const ecommerce = pool.filter((b) => b.sector === "ecommerce").length;
  const manufacturing = pool.filter((b) => b.sector === "manufacturing").length;
  return { ecommerce, manufacturing };
}

function fmtTime(offsetMinutes: number): string {
  const base = new Date(LAST_RUN);
  base.setMinutes(base.getMinutes() + offsetMinutes);
  return base.toISOString().slice(11, 16);
}

export function getActivityLog(): ActivityEvent[] {
  const disqualified = getDisqualified();
  const all = getAllBusinesses();
  const ecommerceScored = all.filter((b) => b.sector === "ecommerce" && !b.disqualified).length;
  const manufacturingScored = all.filter((b) => b.sector === "manufacturing" && !b.disqualified).length;

  const events: ActivityEvent[] = [
    { id: "e1", timestamp: fmtTime(0), message: `Seeded ${Math.round(all.length * 0.52)} e-commerce candidates (Jumia)`, tone: "default" },
    { id: "e2", timestamp: fmtTime(1), message: `Seeded ${Math.round(all.length * 0.48)} manufacturing candidates (KAM + tenders)`, tone: "default" },
    { id: "e3", timestamp: fmtTime(3), message: "Footprint check complete — 9 common databases scanned per candidate", tone: "default" },
  ];

  disqualified.slice(0, 4).forEach((b, i) => {
    events.push({
      id: `dq-${b.id}`,
      timestamp: fmtTime(5 + i),
      message: `Disqualified: ${b.name} (${b.disqualifyReason})`,
      tone: "disqualify",
    });
  });

  events.push(
    { id: "e4", timestamp: fmtTime(8), message: `Scored ${manufacturingScored} manufacturing candidates`, tone: "success" },
    { id: "e5", timestamp: fmtTime(9), message: `Scored ${ecommerceScored} e-commerce candidates`, tone: "success" },
    { id: "e6", timestamp: fmtTime(10), message: "Top 50 finalised and ranked by hc_rank", tone: "success" }
  );

  return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
