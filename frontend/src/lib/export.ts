import type { Business } from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTop50Csv(rows: Business[]) {
  const header = ["rank", "name", "sector", "town", "hc_rank", "quality", "obscurity", "since"];
  const lines = [header.join(",")];
  rows.forEach((b, i) => {
    lines.push(
      [i + 1, `"${b.name}"`, b.sector, b.town, b.hc_rank, b.quality, b.obscurity, b.registry_year].join(",")
    );
  });
  download("top50.csv", lines.join("\n"), "text/csv");
}

export function exportProfileMarkdown(b: Business, markdown: string) {
  download(`${b.slug}.md`, markdown, "text/markdown");
}

export function exportAllProfilesMarkdown(rows: Business[], markdownFor: (b: Business) => string) {
  const combined = rows.map((b) => markdownFor(b)).join("\n\n---\n\n");
  download("top50-profiles.md", combined, "text/markdown");
}
