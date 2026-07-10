import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Radar, Scale, ShieldCheck, Sprout } from "lucide-react";
import { getTop50 } from "@/lib/api";
import { ScrollReveal, ScrollRevealGroup } from "./scroll-reveal";

export function TwoAxisSection() {
  const rows = [
    { q: 90, o: 100, note: "Excellent + invisible", hc: 94.9, accent: true },
    { q: 90, o: 50, note: "Excellent + somewhat known", hc: 67.1 },
    { q: 40, o: 100, note: "Mediocre + invisible", hc: 63.2 },
    {
      q: 90,
      o: 0,
      note: "Excellent + already famous — disqualified",
      hc: 0,
      dq: true,
    },
  ];
  return (
    <section id="model" className="border-t border-border/60 bg-background py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-2">
          <ScrollReveal>
            <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-4">
              The Model
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05]">
              A hidden champion must be excellent <em>and</em> unknown.
            </h2>
            <p className="mt-5 text-foreground/70 text-lg leading-relaxed max-w-lg">
              We rank on both axes at once. The final score is the geometric
              mean of Quality and Obscurity, so a business strong on only one
              axis cannot compensate.
            </p>
            <div className="mt-8 rounded-lg border border-border bg-card px-5 py-4 mono text-sm text-foreground/80">
              hc_rank = <span className="text-amber">√</span>( Quality ×{" "}
              <span className="text-amber">Obscurity</span> )
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-[1fr_60px_60px_70px] gap-2 mono text-[10px] uppercase tracking-widest text-muted-foreground pb-3 border-b border-border">
              <div>Scenario</div>
              <div className="text-right">Qual</div>
              <div className="text-right">Obs</div>
              <div className="text-right">HC</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_60px_60px_70px] gap-2 py-3 border-b border-border/50 items-baseline ${
                  r.dq ? "opacity-50" : ""
                }`}
              >
                <div className="text-sm text-foreground">
                  {r.note}
                  {r.accent && (
                    <span className="ml-2 mono text-[10px] text-amber">
                      ← target
                    </span>
                  )}
                </div>
                <div className="text-right mono text-sm">{r.q}</div>
                <div className="text-right mono text-sm">{r.o}</div>
                <div
                  className={`text-right font-display text-lg ${
                    r.dq
                      ? "text-terracotta line-through"
                      : r.accent
                        ? "text-forest"
                        : ""
                  }`}
                >
                  {r.hc}
                </div>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export function PillarsSection() {
  const pillars = [
    {
      icon: Radar,
      title: "Public sources only",
      body: "Jumia, KAM, PPRA, OpenStreetMap, hiring boards. No paid APIs required.",
    },
    {
      icon: Scale,
      title: "Sector-normalised",
      body: "Manufacturers are compared to manufacturers. No cross-sector distortion.",
    },
    {
      icon: ShieldCheck,
      title: "Hard exclusion gate",
      body: "Nine common databases checked. A single strong hit disqualifies.",
    },
    {
      icon: Sprout,
      title: "Append-only evidence",
      body: "Every claim traces to a signal row with a source and timestamp.",
    },
  ];
  return (
    <section id="pillars" className="bg-forest text-forest-foreground py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal className="max-w-2xl">
          <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-4">
            Principles
          </p>
          <h2 className="font-display text-4xl md:text-5xl leading-tight">
            A repeatable engine, not a one-off list.
          </h2>
        </ScrollReveal>
        <ScrollRevealGroup className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="border-t border-white/15 pt-6">
              <p.icon className="h-6 w-6 text-amber" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-xl">{p.title}</h3>
              <p className="mt-2 text-white/70 text-sm leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </ScrollRevealGroup>
      </div>
    </section>
  );
}

export function ChampionsPreview() {
  const { data } = useQuery({
    queryKey: ["top50", "landing"],
    queryFn: () => getTop50(6),
  });
  const top = data ?? [];
  return (
    <section id="champions" className="bg-background py-24 border-t border-border scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">
              Current cohort
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground">
              This quarter's hidden champions.
            </h2>
          </div>
          <Link
            to="/app/top50"
            className="mono text-xs uppercase tracking-[0.25em] text-forest hover:text-amber flex items-center gap-2"
          >
            See all 50 <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>

        <ScrollRevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {top.map((b, i) => (
            <Link
              key={b.id}
              to="/app/profile/$id"
              params={{ id: String(b.id) }}
              className={`group rounded-2xl border border-border bg-card p-6 transition-all hover:border-amber hover:shadow-md ${
                i < 3 ? "border-l-4 border-l-amber" : ""
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="mono text-xs uppercase tracking-widest text-muted-foreground">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-2xl text-forest">
                  {b.hc_rank}
                </span>
              </div>
              <h3 className="mt-3 font-display text-xl text-foreground group-hover:text-forest">
                {b.name}
              </h3>
              <p className="mono text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
                {b.sector} · {b.town}
              </p>
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-14">
                    Qual
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-forest"
                      style={{ width: `${b.quality ?? 0}%` }}
                    />
                  </div>
                  <span className="mono text-xs w-8 text-right">
                    {b.quality}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-14">
                    Obs
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber"
                      style={{ width: `${b.obscurity ?? 0}%` }}
                    />
                  </div>
                  <span className="mono text-xs w-8 text-right">
                    {b.obscurity}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </ScrollRevealGroup>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-forest text-forest-foreground border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-6 grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 mono text-xs uppercase tracking-[0.3em]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" /> The Unlisted
          </div>
          <p className="mt-4 max-w-sm text-white/70 text-sm leading-relaxed">
            A discovery engine for the exceptional Kenyan businesses the startup
            ecosystem has systematically missed. Built for the Kuzana Hidden
            Champions bounty.
          </p>
        </div>
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-white/50 mb-3">
            Dashboard
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/app" className="hover:text-amber">
                Pipeline
              </Link>
            </li>
            <li>
              <Link to="/app/top50" className="hover:text-amber">
                Top 50
              </Link>
            </li>
            <li>
              <Link to="/app/candidates" className="hover:text-amber">
                Candidates
              </Link>
            </li>
            <li>
              <Link to="/app/outreach" className="hover:text-amber">
                Outreach
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-white/50 mb-3">
            Docs
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/app/docs" className="hover:text-amber">
                Methodology
              </Link>
            </li>
            <li>
              <Link
                to="/app/docs/$slug"
                params={{ slug: "04-scoring-rubric" }}
                className="hover:text-amber"
              >
                Scoring
              </Link>
            </li>
            <li>
              <Link
                to="/app/docs/$slug"
                params={{ slug: "06-data-ethics-compliance" }}
                className="hover:text-amber"
              >
                Ethics
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-white/50 mb-3">
            Contact
          </p>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Nairobi, Kenya</li>
            <li>hello@theunlisted.ke</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 mono text-[10px] uppercase tracking-widest text-white/40">
        <span>© 2026 The Unlisted · Kuzana bounty submission</span>
        <span>Quarterly refresh · Q4 / 2026</span>
      </div>
    </footer>
  );
}
