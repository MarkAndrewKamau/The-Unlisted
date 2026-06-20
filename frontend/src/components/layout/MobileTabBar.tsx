import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { BarChart2, BookOpen, LayoutGrid, Trophy, Users } from "lucide-react";

const NAV = [
  { to: "/", label: "Pipeline", icon: BarChart2 },
  { to: "/candidates", label: "Candidates", icon: LayoutGrid },
  { to: "/top-50", label: "Top 50", icon: Trophy },
  { to: "/outreach", label: "Outreach", icon: Users },
  { to: "/docs", label: "Docs", icon: BookOpen },
];

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-between border-t border-border bg-background px-1 py-1.5 md:hidden">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center gap-0.5 rounded py-1 font-mono text-[10px] uppercase",
              isActive ? "text-amber" : "text-text-muted"
            )
          }
        >
          <item.icon size={16} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
