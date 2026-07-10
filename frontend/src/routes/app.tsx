import { Link, Outlet, useRouterState, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  Database,
  LayoutDashboard,
  MessageCircle,
  Trophy,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { getPipelineStats } from "@/lib/api";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV: Array<{ to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { to: "/app", label: "Pipeline", icon: Activity },
  { to: "/app/candidates", label: "Candidates", icon: Database },
  { to: "/app/top50", label: "Top 50", icon: Trophy },
  { to: "/app/outreach", label: "Outreach", icon: MessageCircle },
  { to: "/app/docs", label: "Docs", icon: BookOpen },
];

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/app" ? pathname === "/app" : pathname.startsWith(to));
  const { data: stats } = useQuery({ queryKey: ["pipeline-stats"], queryFn: getPipelineStats });
  const lastRunLabel = stats?.last_run
    ? new Date(stats.last_run).toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : "—";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Link to="/" className="px-6 py-6 border-b border-sidebar-border flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          <span className="mono text-xs uppercase tracking-[0.3em]">The Unlisted</span>
        </Link>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(item.to)
                  ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
              {isActive(item.to) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber" />}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-sidebar-border mono text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Pipeline · Idle
          </div>
          <p className="mt-2 opacity-70">Last run · {lastRunLabel}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground md:hidden" />
            <span className="mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Kuzana / {stats?.cycle ?? "…"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
              analyst@theunlisted.ke
            </span>
            <div className="h-8 w-8 rounded-full bg-forest text-forest-foreground grid place-items-center font-display text-sm">
              M
            </div>
          </div>
        </header>

        {/* Mobile tab bar */}
        <nav className="md:hidden flex overflow-x-auto border-b border-border px-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-3 text-xs whitespace-nowrap ${
                isActive(item.to) ? "text-forest border-b-2 border-amber font-medium" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
