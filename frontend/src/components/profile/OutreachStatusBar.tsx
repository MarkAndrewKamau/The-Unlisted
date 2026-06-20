import { useState } from "react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { OutreachRecord, OutreachStatus } from "../../lib/types";

const STAGES: { id: OutreachStatus; label: string }[] = [
  { id: "identified", label: "Identified" },
  { id: "contacted", label: "Contacted" },
  { id: "responded", label: "Responded" },
  { id: "interviewed", label: "Interviewed" },
  { id: "joined", label: "Joined" },
];

export function OutreachStatusBar({ record }: { record: OutreachRecord }) {
  const { updateOutreachNotes, addActivity } = useApp();
  const [notes, setNotes] = useState(record.notes);
  const [lastContact, setLastContact] = useState(record.lastTouch ?? "");
  const activeIdx = STAGES.findIndex((s) => s.id === record.status);

  return (
    <div>
      <div className="flex items-center">
        {STAGES.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px]",
                  i <= activeIdx ? "border-amber bg-amber text-forest" : "border-border bg-background text-text-muted"
                )}
              >
                {i + 1}
              </span>
              <span className={clsx("font-mono text-[10px] uppercase tracking-wide", i <= activeIdx ? "text-amber" : "text-text-muted")}>
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={clsx("mx-1 h-px flex-1", i < activeIdx ? "bg-amber" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-text-muted">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-background p-2 font-body text-sm focus:border-forest focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-text-muted">Last contact</label>
          <input
            type="date"
            value={lastContact}
            onChange={(e) => setLastContact(e.target.value)}
            className="w-full rounded border border-border bg-background p-2 font-mono text-sm focus:border-forest focus:outline-none"
          />
          <Button
            size="sm"
            className="mt-2"
            onClick={() => {
              updateOutreachNotes(record.businessSlug, notes);
              addActivity({ timestamp: new Date().toISOString().slice(11, 16), message: `Logged contact for outreach record`, tone: "default" });
            }}
          >
            Log Contact
          </Button>
        </div>
      </div>
    </div>
  );
}
