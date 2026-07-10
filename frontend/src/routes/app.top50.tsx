import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCandidates, getPipelineStats, getTop50 } from "@/lib/api";
import { OnchainBadge } from "@/components/onchain-badge";
import { Download, FileArchive } from "lucide-react";

export const Route = createFileRoute("/app/top50")({
  head: () => ({ meta: [{ title: "Top 50 · The Unlisted" }] }),
  component: Top50Page,
});

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Top50Page() {
  const { data } = useQuery({ queryKey: ["top50", 50], queryFn: () => getTop50(50) });
  const stats = useQuery({ queryKey: ["pipeline-stats"], queryFn: getPipelineStats });
  const active = data ?? [];
  const avgQ = active.length
    ? Math.round(active.reduce((s, b) => s + (b.quality ?? 0), 0) / active.length)
    : 0;
  const avgO = active.length
    ? Math.round(active.reduce((s, b) => s + (b.obscurity ?? 0), 0) / active.length)
    : 0;

  function exportCsv() {
    const header = ["rank", "name", "sector", "town", "hc_rank", "quality", "obscurity", "since"];
    const lines = [header.join(",")];
    active.forEach((b, i) => {
      lines.push(
        [i + 1, `"${b.name}"`, b.sector, b.town, b.hc_rank, b.quality, b.obscurity, b.registry_year ?? ""].join(","),
      );
    });
    download("top50.csv", lines.join("\n"));
  }

  return (
    <div className="p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">
            Cohort · {stats.data?.cycle ?? "…"}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-foreground">The Top 50</h1>
          <p className="mt-3 text-foreground/70 max-w-xl">
            Businesses that passed the exclusion gate and ranked highest on the two-axis model.
          </p>
          <div className="mt-4">
            <OnchainBadge />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-forest"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <a
            href="/api/docs/04-scoring-rubric"
            className="flex items-center gap-2 rounded-md bg-forest text-forest-foreground px-3 py-2 text-sm hover:opacity-90"
          >
            <FileArchive className="h-4 w-4" /> Scoring rubric
          </a>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Champions" value={active.length.toString()} />
        <StatCard label="Total candidates" value={(stats.data?.seeded ?? 0).toLocaleString()} />
        <StatCard label="Avg quality" value={avgQ.toString()} accent />
        <StatCard label="Avg obscurity" value={avgO.toString()} accent />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((b, i) => (
          <Link
            key={b.id}
            to="/app/profile/$id"
            params={{ id: String(b.id) }}
            className={`group relative rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition ${
              i < 3 ? "border-l-4 border-l-amber" : ""
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display italic text-4xl text-forest/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="text-right">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  HC Score
                </div>
                <div className="font-display text-3xl text-forest">{b.hc_rank}</div>
              </div>
            </div>
            <h3 className="mt-4 font-display text-xl text-foreground group-hover:text-forest">
              {b.name}
            </h3>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {b.sector} · {b.town}
              {b.registry_year ? ` · since ${b.registry_year}` : ""}
            </p>
            <div className="mt-5 space-y-2">
              <ScoreBar label="Quality" value={b.quality ?? 0} color="bg-forest" />
              <ScoreBar label="Obscurity" value={b.obscurity ?? 0} color="bg-amber" />
            </div>
            <div className="mt-5 pt-4 border-t border-border space-y-1">
              {b.dimensions.slice(0, 3).map((d) => (
                <div key={d.name} className="mono text-[11px] text-muted-foreground truncate">
                  · {d.name}: <span className="text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl ${accent ? "text-amber" : "text-forest"}`}>
        {value}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-16">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="mono text-xs w-8 text-right">{value}</span>
    </div>
  );
}
