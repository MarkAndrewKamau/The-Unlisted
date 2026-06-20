// Port of discovery/profile.py's template mode (no ANTHROPIC_API_KEY) — the
// markdown profile is grounded only in stored evidence, exactly like the
// Python pipeline's offline fallback.
import { evidenceRows } from "./evidence";
import { COMMON_DATABASES } from "./constants";
import type { Business } from "./types";

function heuristicWhy(b: Business): string {
  const bits: string[] = [];
  if (b.signals.longevity_years >= 10) bits.push(`${b.signals.longevity_years} years of survival`);
  if (b.signals.review_count > 0) bits.push(`${b.signals.rating.toFixed(1)}★ across ${b.signals.review_count} reviews`);
  if (b.signals.tenders_won > 0) bits.push(`${b.signals.tenders_won} public tenders won`);
  return bits.length
    ? `Strong fundamentals with near-zero ecosystem noise: ${bits.join(", ")}.`
    : "Quietly excellent on the collected signals.";
}

export function generateProfileMarkdown(b: Business): string {
  const evidence = evidenceRows(b)
    .map((r) => `- \`${r.type}\`: ${r.value}  (source: ${r.source})`)
    .join("\n");

  const footprintMap = new Map(b.footprint.map((f) => [f.source, f.hits]));
  const footprintLines = b.disqualified || b.footprint.length
    ? Object.keys(COMMON_DATABASES)
        .filter((d) => (footprintMap.get(d) ?? 0) > 0)
        .map((d) => `- ${d}: ${footprintMap.get(d)}`)
        .join("\n")
    : "- none found — invisible to the startup ecosystem ✅";

  const growth: string[] = [];
  if (b.signals.locations > 0) growth.push(`${b.signals.locations} locations`);
  if (b.signals.job_postings > 0) growth.push(`${b.signals.job_postings} open roles`);

  return `# ${b.name}

**Sector:** ${b.sector}  |  **Town:** ${b.town}  |  **Operating since:** ${b.registry_year}
**Hidden-Champion rank:** ${b.hc_rank}  (Quality ${b.quality} × Obscurity ${b.obscurity})

## Why this business is exceptional
${heuristicWhy(b)}

## Evidence (public signals)
${evidence}

## Ecosystem footprint
${footprintLines}

## Profile — to complete via outreach/research
- **Founder background:** _needs research_
- **Business model:** _needs research_
- **Growth indicators:** ${growth.length ? growth.join(", ") : "_needs research_"}
- **Risks / open questions:** _needs research_

_Generated offline (template mode). All quantitative claims trace to the evidence above._
`;
}
