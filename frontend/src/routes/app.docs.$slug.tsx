import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import type { DocDetail } from "@/lib/types";
import { getDoc } from "@/lib/api";

export const Route = createFileRoute("/app/docs/$slug")({
  head: ({ loaderData }) => {
    const d = loaderData as DocDetail | undefined;
    return { meta: [{ title: `${d?.title ?? "Doc"} · The Unlisted` }] };
  },
  loader: async ({ params }) => {
    try {
      return await getDoc(params.slug);
    } catch {
      throw notFound();
    }
  },
  component: DocPage,
  notFoundComponent: () => (
    <div>
      <h2 className="font-display text-2xl">Doc not found</h2>
      <Link to="/app/docs" className="text-forest underline">Back to docs</Link>
    </div>
  ),
});

function DocPage() {
  const d = Route.useLoaderData() as DocDetail;
  const body = d.body.replace(/^#\s.*\n+/, ""); // strip the leading H1, shown separately below
  return (
    <article className="prose-docs">
      <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-2">{d.number}</p>
      <h1 className="font-display text-4xl text-foreground">{d.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </article>
  );
}

// Minimal markdown renderer — enough for the seed docs.
function renderMarkdown(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let inTable = false;

  const flushList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const flushCode = () => { if (inCode) { out.push("</code></pre>"); inCode = false; } };
  const flushTable = () => { if (inTable) { out.push("</tbody></table>"); inTable = false; } };

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCode) { flushList(); flushTable(); out.push('<pre><code>'); inCode = true; }
      else flushCode();
      continue;
    }
    if (inCode) { out.push(line); continue; }
    if (line.startsWith("## ")) { flushList(); flushTable(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("### ")) { flushList(); flushTable(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("- ")) {
      if (!inList) { flushTable(); out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (line.startsWith("| ")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue;
      if (!inTable) {
        flushList();
        out.push('<table class="w-full text-sm my-6 border-collapse"><thead><tr>');
        cells.forEach((c) => out.push(`<th class="text-left font-semibold border-b border-border py-2 pr-4">${inline(c)}</th>`));
        out.push("</tr></thead><tbody>");
        inTable = true;
      } else {
        out.push("<tr>");
        cells.forEach((c) => out.push(`<td class="border-b border-border py-2 pr-4">${inline(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    }
    if (!line.trim()) { flushList(); flushTable(); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushList(); flushCode(); flushTable();
  return out.join("\n");
}
