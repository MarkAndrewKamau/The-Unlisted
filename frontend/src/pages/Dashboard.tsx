import { PipelineFunnel } from "../components/pipeline/PipelineFunnel";
import { StageControls } from "../components/pipeline/StageControls";
import { LeaderboardPreview } from "../components/dashboard/LeaderboardPreview";
import { ActivityLog } from "../components/dashboard/ActivityLog";
import { useApp } from "../context/AppContext";

export function Dashboard() {
  const { lastRun } = useApp();
  const lastRunLabel = new Date(lastRun).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <div className="grid gap-6 p-4 md:grid-cols-[1.15fr_1fr] md:p-8">
      <section className="min-w-0">
        <PipelineFunnel />
        <p className="mt-2 font-mono text-[11px] text-text-muted">Last run: {lastRunLabel}</p>
        <StageControls />
      </section>

      <section className="flex min-w-0 flex-col gap-6">
        <div>
          <h2 className="font-display text-xl italic text-text-primary">Current Top 5</h2>
          <div className="mt-3">
            <LeaderboardPreview />
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-text-muted">Activity</h2>
          <ActivityLog />
        </div>
      </section>
    </div>
  );
}
