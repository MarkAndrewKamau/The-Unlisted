import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getTop50 } from "@/lib/api";

export function CinematicHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["top50", "hero"],
    queryFn: () => getTop50(1),
  });
  const top = data?.[0];

  const ringOffset = useMemo(() => {
    const circumference = 402;
    const value = top?.obscurity ?? 0;
    return circumference - (circumference * value) / 100;
  }, [top]);

  useEffect(() => {
    if (!rootRef.current) return;
    const targets = rootRef.current.querySelectorAll(".gsap-reveal");
    gsap.set(targets, { autoAlpha: 0, y: 24 });
    gsap.to(targets, {
      autoAlpha: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.1,
    });
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--mouse-x",
      `${e.clientX - rect.left}px`,
    );
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-background py-28 md:py-36"
    >
      <div className="absolute inset-0 bg-grid-theme" />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="gsap-reveal mono mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-amber">
            <Sparkles className="h-3.5 w-3.5" /> Kuzana Hidden Champions
          </p>
          <h1 className="gsap-reveal font-display text-5xl leading-[1.02] md:text-7xl">
            <span className="text-silver-matte">The best businesses</span>
            <br />
            <span className="text-3d-matte">you've never heard of.</span>
          </h1>
          <p className="gsap-reveal mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            A discovery engine that finds exceptional Kenyan businesses the
            startup ecosystem has systematically missed — found, scored, and
            ranked on Quality × Obscurity.
          </p>
          <div className="gsap-reveal mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/app"
              className="btn-modern-dark inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            >
              Open the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/docs"
              className="btn-modern-light inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            >
              <BookOpen className="h-4 w-4" /> Read the methodology
            </Link>
          </div>
        </div>

        <div className="gsap-reveal relative mx-auto w-full max-w-sm">
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className="premium-depth-card relative overflow-hidden rounded-2xl p-7 text-forest-foreground"
          >
            <div className="card-sheen" />
            <p className="mono text-[10px] uppercase tracking-[0.3em] text-amber/80">
              This quarter's #1
            </p>
            <h3 className="mt-3 font-display text-2xl">
              {top?.name ?? "Scoring in progress…"}
            </h3>
            <p className="mono mt-1 text-xs uppercase tracking-widest text-white/50">
              {top ? `${top.sector} · ${top.town}` : "—"}
            </p>

            <div className="mt-6 flex items-center gap-6">
              <svg viewBox="0 0 150 150" className="h-24 w-24 shrink-0">
                <circle
                  cx="75"
                  cy="75"
                  r="64"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="10"
                />
                <circle
                  cx="75"
                  cy="75"
                  r="64"
                  fill="none"
                  stroke="var(--color-amber)"
                  strokeWidth="10"
                  className="progress-ring"
                  style={{ strokeDashoffset: ringOffset }}
                />
                <text
                  x="75"
                  y="82"
                  textAnchor="middle"
                  className="fill-white font-mono text-2xl"
                >
                  {top ? Math.round(top.obscurity ?? 0) : "—"}
                </text>
              </svg>
              <div className="space-y-2 text-xs">
                <div className="floating-ui-badge rounded-full px-3 py-1.5">
                  Quality {top?.quality?.toFixed(0) ?? "—"}
                </div>
                <div className="floating-ui-badge rounded-full px-3 py-1.5">
                  HC rank {top?.hc_rank?.toFixed(0) ?? "—"}
                </div>
              </div>
            </div>

            <div className="widget-depth mt-6 rounded-lg p-3 mono text-[11px] text-white/70">
              hc_rank = √(Quality × Obscurity)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
