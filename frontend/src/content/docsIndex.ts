import methodology from "./docs/01-methodology.md?raw";
import sources from "./docs/02-sources.md?raw";
import exclusion from "./docs/03-exclusion-criteria.md?raw";
import rubric from "./docs/04-scoring-rubric.md?raw";
import interview from "./docs/05-interview-script.md?raw";
import ethics from "./docs/06-data-ethics-compliance.md?raw";
import runbook from "./docs/07-rerun-runbook.md?raw";

export interface DocEntry {
  slug: string;
  number: string;
  title: string;
  content: string;
}

export const DOCS: DocEntry[] = [
  { slug: "methodology", number: "01", title: "Methodology", content: methodology },
  { slug: "sources", number: "02", title: "Sources", content: sources },
  { slug: "exclusion-criteria", number: "03", title: "Exclusion Criteria", content: exclusion },
  { slug: "scoring-rubric", number: "04", title: "Scoring Rubric", content: rubric },
  { slug: "interview-script", number: "05", title: "Interview Script", content: interview },
  { slug: "data-ethics", number: "06", title: "Data Ethics", content: ethics },
  { slug: "rerun-runbook", number: "07", title: "Re-run Runbook", content: runbook },
];

export function getDoc(slug: string): DocEntry {
  return DOCS.find((d) => d.slug === slug) ?? DOCS[0];
}
