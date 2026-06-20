import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { BarChart2, BookOpen, LayoutGrid, Trophy, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";

const NAV = [
  { to: "/", label: "Pipeline", icon: BarChart2 },
  { to: "/candidates", label: "Candidates", icon: LayoutGrid },
  { to: "/top-50", label: "Top 50", icon: Trophy },
  { to: "/outreach", label: "Outreach", icon: Users },
  { to: "/docs", label: "Docs", icon: BookOpen },
];

export function Sidebar() {
  const { cycle } = useApp();
  return (
    <aside className="hidden h-screen w-[220px] shrink-0 flex-col border-r border-forest/20 bg-forest md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="h-2 w-2 rounded-full bg-amber" />
        <span className="font-mono text-sm font-medium tracking-wide text-surface">THE UNLISTED</span>
      </div>
      <nav className="flex-1 px-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "mb-1 flex items-center gap-3 rounded border-l-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors",
                isActive
                  ? "border-amber bg-white/5 text-amber"
                  : "border-transparent text-surface/60 hover:text-surface"
              )
            }
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4">
        <div className="mb-2 inline-flex rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-surface/70">
          {cycle}
        </div>
        <p className="font-mono text-[10px] text-surface/30">The Unlisted © 2026</p>
      </div>
    </aside>
  );
}
