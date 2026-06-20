import { useEffect, useState } from "react";
import clsx from "clsx";

export function ScoreBar({
  label,
  value,
  max = 100,
  color = "success",
  size = "md",
}: {
  label?: string;
  value: number;
  max?: number;
  color?: "success" | "amber";
  size?: "sm" | "md";
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), 50);
    return () => clearTimeout(t);
  }, [value, max]);

  const barColor = color === "success" ? "bg-success" : "bg-amber";

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
          <span className="font-mono text-[11px] text-text-primary">{value.toFixed(1)}</span>
        </div>
      )}
      <div className={clsx("w-full overflow-hidden rounded-sm bg-border/50", size === "sm" ? "h-1.5" : "h-2")}>
        <div
          className={clsx("h-full rounded-sm transition-all duration-700 ease-out", barColor)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
