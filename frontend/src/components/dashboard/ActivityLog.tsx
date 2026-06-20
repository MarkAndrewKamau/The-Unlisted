import clsx from "clsx";
import { useApp } from "../../context/AppContext";

export function ActivityLog() {
  const { activity } = useApp();

  return (
    <div className="max-h-72 overflow-y-auto scrollbar-thin rounded border border-border bg-surface p-3">
      {activity.map((event) => (
        <div key={event.id} className="animate-slide-in-top flex gap-2 py-1 font-mono text-xs">
          <span className="shrink-0 text-text-muted">{event.timestamp}</span>
          <span className="shrink-0 text-text-muted">·</span>
          <span
            className={clsx(
              "min-w-0 wrap-break-word",
              event.tone === "disqualify" && "text-terracotta",
              event.tone === "success" && "text-success",
              event.tone === "default" && "text-text-primary"
            )}
          >
            {event.message}
          </span>
        </div>
      ))}
    </div>
  );
}
