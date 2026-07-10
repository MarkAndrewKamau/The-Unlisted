import {
  Link,
  Outlet,
  useRouterState,
  useNavigate,
  useSearch,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { useState, type ComponentType, type SVGProps } from "react";
import { getPipelineStats } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { getToken } from "@/lib/auth-client";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!getToken()) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const SECTORS = ["ecommerce", "manufacturing", "agriculture", "logistics"] as const;
const STATUSES = ["active", "disqualified"] as const;

const NAV: Array<{
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  subsections?: "candidates";
}> = [
  { to: "/app", label: "Pipeline", icon: Activity },
  { to: "/app/candidates", label: "Candidates", icon: Database, subsections: "candidates" },
  { to: "/app/top50", label: "Top 50", icon: Trophy },
  { to: "/app/outreach", label: "Outreach", icon: MessageCircle },
  { to: "/app/docs", label: "Docs", icon: BookOpen },
];

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { sector?: string; status?: string };
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (to: string) => (to === "/app" ? pathname === "/app" : pathname.startsWith(to));
  const { data: stats } = useQuery({ queryKey: ["pipeline-stats"], queryFn: getPipelineStats });
  const lastRunLabel = stats?.last_run
    ? new Date(stats.last_run).toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : "—";

  function doLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col ${collapsed ? "w-16" : "w-64"} bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200`}
      >
        <Link
          to="/"
          className="px-4 py-6 border-b border-sidebar-border flex items-center gap-2 overflow-hidden"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
          {!collapsed && <span className="mono text-xs uppercase tracking-[0.3em] truncate">The Unlisted</span>}
        </Link>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber" />}
                    </>
                  )}
                </Link>

                {/* Contextual sub-sections: only shown expanded, uncollapsed, on the matching page */}
                {!collapsed && active && item.subsections === "candidates" && (
                  <div className="ml-6 mt-1 mb-2 space-y-3 border-l border-sidebar-border pl-3">
                    <div>
                      <p className="mono text-[9px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
                        Sector
                      </p>
                      <div className="space-y-0.5">
                        {SECTORS.map((s) => (
                          <Link
                            key={s}
                            to="/app/candidates"
                            search={{ sector: s }}
                            className={`block rounded px-2 py-1 text-xs capitalize transition-colors ${
                              search.sector === s
                                ? "text-amber font-medium"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                            }`}
                          >
                            {s}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mono text-[9px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">
                        Status
                      </p>
                      <div className="space-y-0.5">
                        {STATUSES.map((s) => (
                          <Link
                            key={s}
                            to="/app/candidates"
                            search={{ status: s }}
                            className={`block rounded px-2 py-1 text-xs capitalize transition-colors ${
                              search.status === s
                                ? "text-amber font-medium"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                            }`}
                          >
                            {s}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground text-xs"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
        {!collapsed && (
          <div className="px-6 py-5 border-t border-sidebar-border mono text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pipeline · Idle
            </div>
            <p className="mt-2 opacity-70">Last run · {lastRunLabel}</p>
          </div>
        )}
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
              {user?.email ?? ""}
            </span>
            <div className="h-8 w-8 rounded-full bg-forest text-forest-foreground grid place-items-center font-display text-sm">
              {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={doLogout}
              title="Log out"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
