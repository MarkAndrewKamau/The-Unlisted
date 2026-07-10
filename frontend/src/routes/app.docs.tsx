import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDocs } from "@/lib/api";

export const Route = createFileRoute("/app/docs")({
  head: () => ({ meta: [{ title: "Docs · The Unlisted" }] }),
  component: DocsLayout,
});

function DocsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/app/docs" || pathname === "/app/docs/";
  const { data } = useQuery({ queryKey: ["docs"], queryFn: getDocs });
  const docs = data ?? [];
  return (
    <div className="p-6 md:p-10 grid gap-8 md:grid-cols-[220px_1fr] max-w-6xl mx-auto">
      <aside className="md:sticky md:top-6 h-fit">
        <p className="mono text-[10px] uppercase tracking-widest text-amber mb-4">Documentation</p>
        <nav className="space-y-1">
          {docs.map((d) => {
            const active = pathname.endsWith(d.slug);
            return (
              <Link
                key={d.slug}
                to="/app/docs/$slug"
                params={{ slug: d.slug }}
                className={`flex items-baseline gap-3 py-2 text-sm ${
                  active ? "text-forest font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="mono text-[10px] w-6">{d.number}</span>
                <span>{d.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{isIndex ? <DocsIndex docs={docs} /> : <Outlet />}</div>
    </div>
  );
}

function DocsIndex({ docs }: { docs: { slug: string; number: string; title: string }[] }) {
  return (
    <div>
      <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">Docs</p>
      <h1 className="font-display text-4xl text-foreground">Methodology & runbooks</h1>
      <p className="mt-3 text-foreground/70 max-w-xl">
        Everything an analyst needs to understand how The Unlisted works, and to run the quarterly
        discovery cycle themselves.
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {docs.map((d) => (
          <Link
            key={d.slug}
            to="/app/docs/$slug"
            params={{ slug: d.slug }}
            className="group rounded-xl border border-border bg-card p-5 hover:border-amber transition"
          >
            <div className="flex items-baseline justify-between">
              <span className="mono text-[10px] uppercase tracking-widest text-amber">{d.number}</span>
            </div>
            <h3 className="mt-3 font-display text-xl group-hover:text-forest">{d.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
