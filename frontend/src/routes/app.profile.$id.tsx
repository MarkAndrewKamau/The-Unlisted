import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCandidate, getCandidateProfile, verifyCandidate, disqualifyCandidate } from "@/lib/api";
import type { BusinessDetail } from "@/lib/types";
import { InvestorSignals } from "@/components/investor-signals";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { ArrowLeft, CheckCircle2, Send, Download, XCircle, Share2 } from "lucide-react";

export const Route = createFileRoute("/app/profile/$id")({
  head: ({ loaderData }) => {
    const b = loaderData as BusinessDetail | undefined;
    if (!b) return { meta: [{ title: "Not found · The Unlisted" }] };
    return {
      meta: [
        { title: `${b.name} · Hidden Champion Profile` },
        { name: "description", content: `${b.sector} · ${b.town} · hc_rank ${b.hc_rank}` },
      ],
    };
  },
  loader: async ({ params }) => {
    try {
      return await getCandidate(Number(params.id));
    } catch {
      throw notFound();
    }
  },
  component: ProfilePage,
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p className="mono text-xs uppercase tracking-widest text-muted-foreground">Profile</p>
      <h2 className="font-display text-3xl mt-2">Business not found</h2>
      <Link to="/app/top50" className="mt-4 inline-block text-forest underline">
        Back to Top 50
      </Link>
    </div>
  ),
});

function ProfilePage() {
  const initial = Route.useLoaderData() as BusinessDetail;
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: b = initial } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => getCandidate(Number(id)),
    initialData: initial,
  });
  const [showDisqualify, setShowDisqualify] = useState(false);
  const [reason, setReason] = useState("");

  const verify = useMutation({
    mutationFn: () => verifyCandidate(b.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", id] }),
  });
  const disqualify = useMutation({
    mutationFn: (r: string) => disqualifyCandidate(b.id, r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", id] });
      setShowDisqualify(false);
      setReason("");
    },
  });

  async function exportMarkdown() {
    const { markdown } = await getCandidateProfile(b.id);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartData = b.dimensions.map((d) => ({ name: d.name, value: d.value }));
  const hits = b.footprint.filter((f) => f.hit).length;

  return (
    <div className="min-h-full pb-24">
      {/* Hero */}
      <div className="bg-forest text-forest-foreground p-8 md:p-12 relative overflow-hidden">
        <Link
          to="/app/top50"
          className="inline-flex items-center gap-2 mono text-[10px] uppercase tracking-widest text-white/60 hover:text-amber"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Top 50
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-2">
              {b.sector}
              {b.manually_disqualified ? " · manually disqualified" : b.disqualified ? " · disqualified" : ""}
            </p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.02]">{b.name}</h1>
            <p className="mt-2 text-white/70">
              {b.town}
              {b.registry_year ? ` · operating since ${b.registry_year}` : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <ScorePill label="Quality" value={b.quality ?? 0} />
            <ScorePill label="Obscurity" value={b.obscurity ?? 0} />
            <ScorePill label="HC Score" value={b.hc_rank ?? 0} accent />
          </div>
        </div>
        <div className="mt-8 flex gap-2">
          <button className="rounded-md bg-white/10 backdrop-blur px-3 py-2 text-sm hover:bg-white/20 flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share profile
          </button>
          {b.verified && (
            <span className="rounded-md bg-amber/20 text-amber px-3 py-2 mono text-xs uppercase tracking-widest">
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12">
        {b.reason && (
          <section className="rounded-2xl border border-terracotta/40 bg-terracotta/5 p-6">
            <p className="mono text-[10px] uppercase tracking-widest text-terracotta mb-2">
              Disqualification reason
            </p>
            <p className="text-foreground/80">{b.reason}</p>
          </section>
        )}

        {/* Score breakdown */}
        <section className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl mb-4">Quality — six dimensions</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i % 2 ? "var(--forest)" : "var(--amber)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl mb-4">Obscurity</h3>
            <ObscurityGauge value={b.obscurity ?? 0} />
            <div className="mt-4 text-center">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Footprint hits
              </p>
              <p className="font-display text-3xl text-forest">{hits} / {b.footprint.length}</p>
            </div>
          </div>
        </section>

        <InvestorSignals business={b} />

        {/* Footprint table */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl mb-4">Footprint check</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left pb-2">Database</th>
                <th className="text-left pb-2">Hit</th>
                <th className="text-left pb-2">Strength</th>
              </tr>
            </thead>
            <tbody>
              {b.footprint.map((f) => (
                <tr key={f.database} className="border-t border-border">
                  <td className="py-2">{f.label}</td>
                  <td className="py-2">
                    {f.hit ? (
                      <span className="text-terracotta">✕ Yes ({f.hits})</span>
                    ) : (
                      <span className="text-muted-foreground">○ No</span>
                    )}
                  </td>
                  <td className="py-2">
                    {f.strong_excluder ? (
                      <span className="mono text-[10px] uppercase tracking-widest text-amber">Strong</span>
                    ) : (
                      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Soft</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Evidence log */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl mb-4">Evidence log</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left pb-2">Signal</th>
                <th className="text-left pb-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(b.signals).map(([type, value]) => (
                <tr key={type} className="border-t border-border">
                  <td className="py-2 mono text-xs">{type}</td>
                  <td className="py-2 font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Outreach */}
        {b.outreach && (
          <section className="rounded-2xl border border-amber/40 bg-amber/5 p-6">
            <h3 className="font-display text-xl mb-4">Founder outreach</h3>
            <OutreachStatusBar stage={b.outreach.status} />
            {b.outreach.notes && (
              <p className="mt-4 text-sm text-foreground/80 border-l-2 border-amber pl-4">
                {b.outreach.notes}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur p-3 flex flex-wrap justify-end gap-2 z-40">
        <button
          onClick={() => verify.mutate()}
          disabled={b.verified || verify.isPending}
          className="rounded-md border border-border px-3 py-2 text-sm flex items-center gap-2 hover:border-forest disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> {b.verified ? "Verified" : "Mark verified"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(b.name + " — Hidden Champion profile")}`}
          className="rounded-md border border-border px-3 py-2 text-sm flex items-center gap-2 hover:border-forest"
        >
          <Send className="h-4 w-4" /> Send to founder
        </a>
        <button
          onClick={exportMarkdown}
          className="rounded-md border border-border px-3 py-2 text-sm flex items-center gap-2 hover:border-forest"
        >
          <Download className="h-4 w-4" /> Export .md
        </button>
        <button
          onClick={() => setShowDisqualify(true)}
          disabled={b.disqualified}
          className="rounded-md bg-terracotta text-terracotta-foreground px-3 py-2 text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" /> Disqualify
        </button>
      </div>

      {showDisqualify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Disqualify {b.name}?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This removes it from the ranked deliverable. Provide a reason.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. found a Crunchbase profile during manual review"
              className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm focus:border-forest focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowDisqualify(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={!reason.trim() || disqualify.isPending}
                onClick={() => disqualify.mutate(reason.trim())}
                className="rounded-md bg-terracotta text-terracotta-foreground px-3 py-2 text-sm disabled:opacity-50"
              >
                Confirm disqualify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScorePill({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl px-4 py-2 min-w-[110px] text-center ${
        accent ? "bg-amber text-amber-foreground" : "bg-white/10 backdrop-blur text-white"
      }`}
    >
      <div className="mono text-[9px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}

function ObscurityGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180;
  const rad = (angle - 90) * (Math.PI / 180);
  const x = 100 + 80 * Math.cos(rad);
  const y = 100 + 80 * Math.sin(rad);
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-muted)" strokeWidth="14" strokeLinecap="round" />
      <path
        d={`M 20 100 A 80 80 0 0 1 ${x} ${y}`}
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r="6" fill="var(--color-forest)" />
      <text x="100" y="95" textAnchor="middle" className="font-display" fontSize="28" fill="var(--color-forest)">
        {value}
      </text>
    </svg>
  );
}

function OutreachStatusBar({ stage }: { stage: string }) {
  const stages = ["identified", "contacted", "responded", "interviewed", "joined"];
  const idx = stages.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= idx ? "bg-amber" : "bg-muted"}`} />
          <div
            className={`mt-2 mono text-[10px] uppercase tracking-widest ${
              i === idx ? "text-amber font-semibold" : "text-muted-foreground"
            }`}
          >
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}
