import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getActivity, getPipelineStats, getTop50, runStage } from "@/lib/api";
import type { StageId } from "@/lib/types";
import { PlayCircle, Terminal, Filter, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: "Pipeline · The Unlisted" }],
  }),
  component: PipelinePage,
});

const STAGES: StageId[] = [
  "seed",
  "footprint",
  "score",
  "profile",
  "export",
  "outreach",
];
const SECTORS = [
  "all",
  "ecommerce",
  "manufacturing",
  "agriculture",
  "logistics",
] as const;

function PipelinePage() {
  const queryClient = useQueryClient();
  const [sector, setSector] = useState<(typeof SECTORS)[number]>("all");
  const [liveLines, setLiveLines] = useState<string[]>([]);

  const stats = useQuery({
    queryKey: ["pipeline-stats"],
    queryFn: getPipelineStats,
  });
  const top5 = useQuery({ queryKey: ["top50", 5], queryFn: () => getTop50(5) });
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => getActivity(30),
  });

  const run = useMutation({
    mutationFn: (stage: StageId) =>
      runStage(stage, sector === "all" ? undefined : sector),
    onSuccess: (result) => {
      setLiveLines(result.lines);
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["top50"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const pipelineStages = stats.data
    ? [
        { id: "seed", label: "Seed", count: stats.data.seeded },
        { id: "score", label: "Score", count: stats.data.seeded },
        {
          id: "exclude",
          label: "Exclude",
          count: stats.data.scored,
          disqualified: stats.data.disqualified,
        },
        { id: "top50", label: "Top 50", count: stats.data.top50 },
      ]
    : [];
  const maxCount = Math.max(1, ...pipelineStages.map((s) => s.count));

  return (
    <div className="p-6 md:p-10 space-y-10">
      <header>
        <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">
          Discovery Pipeline
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground">
          Quarterly run · {stats.data?.cycle ?? "…"}
        </h1>
        <p className="mt-3 text-foreground/70 max-w-2xl">
          Six stages, run end-to-end or one at a time against the real discovery
          engine. Every candidate that flows through is stored with its full
          evidence trail.
        </p>
        {stats.data?.last_run && (
          <p className="mono mt-2 text-[11px] text-muted-foreground">
            Last run:{" "}
            {new Date(stats.data.last_run)
              .toISOString()
              .slice(0, 16)
              .replace("T", " ")}{" "}
            UTC
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Funnel */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-foreground">
              Pipeline funnel
            </h2>
            <div className="flex items-center gap-2 mono text-xs flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className={`px-2.5 py-1 rounded uppercase tracking-widest text-[10px] transition ${
                    sector === s
                      ? "bg-forest text-forest-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {pipelineStages.map((s) => {
              const w = 30 + (s.count / maxCount) * 70;
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div className="w-20 mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">
                    {s.label}
                  </div>
                  <div className="flex-1 relative h-10">
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 h-full rounded-md transition-all flex items-center justify-between px-4 ${
                        s.id === "exclude"
                          ? "bg-terracotta/15 border border-terracotta/40"
                          : s.id === "top50"
                            ? "bg-amber/25 border border-amber"
                            : "bg-forest/10 border border-forest/20"
                      }`}
                      style={{ width: `${w}%` }}
                    >
                      <span className="mono text-xs text-foreground/80">
                        {s.count.toLocaleString()}
                      </span>
                      {"disqualified" in s && s.disqualified ? (
                        <span className="mono text-[10px] text-terracotta">
                          −{s.disqualified.toLocaleString()} DQ
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage controls */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              Run a stage
            </p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => run.mutate(s)}
                  disabled={run.isPending}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md border transition mono uppercase tracking-widest text-xs ${
                    run.isPending && run.variables === s
                      ? "bg-amber text-amber-foreground border-amber"
                      : "border-border hover:border-forest hover:text-forest"
                  } disabled:opacity-50`}
                >
                  <PlayCircle className="h-3.5 w-3.5" /> {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-foreground">
              Top 5 · Live
            </h2>
            <Link
              to="/app/top50"
              className="mono text-[10px] uppercase tracking-widest text-forest hover:text-amber flex items-center gap-1"
            >
              All 50 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-4">
            {(top5.data ?? []).map((b, i) => (
              <li key={b.id}>
                <Link
                  to="/app/profile/$id"
                  params={{ id: String(b.id) }}
                  className="group block rounded-lg border border-transparent hover:border-border p-2 -mx-2"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-2xl text-forest w-8">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-foreground truncate">
                          {b.name}
                        </span>
                        <span className="font-display text-lg text-forest">
                          {b.hc_rank}
                        </span>
                      </div>
                      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {b.sector} · {b.town}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-forest"
                            style={{ width: `${b.quality ?? 0}%` }}
                          />
                        </div>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber"
                            style={{ width: `${b.obscurity ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activity log */}
      <div className="rounded-2xl border border-border bg-forest text-forest-foreground p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-4 w-4 text-amber" />
          <h2 className="mono text-xs uppercase tracking-[0.3em]">
            Activity log
          </h2>
        </div>
        <div className="mono text-xs space-y-1.5 max-h-64 overflow-auto">
          {liveLines.length > 0 && (
            <div className="mb-2 border-b border-white/10 pb-2">
              {liveLines.map((l, i) => (
                <div key={i} className="text-amber">
                  {l}
                </div>
              ))}
            </div>
          )}
          {(activity.data ?? []).map((l) => (
            <div key={l.id} className="flex gap-4">
              <span className="text-white/40">
                {new Date(l.ts).toISOString().slice(11, 19)}
              </span>
              <span
                className={
                  l.tone === "disqualify"
                    ? "text-terracotta"
                    : l.tone === "success"
                      ? "text-amber"
                      : "text-white/85"
                }
              >
                {l.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
