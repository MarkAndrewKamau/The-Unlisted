import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, Printer } from "lucide-react";
import { INTERVIEW_SCRIPT } from "../../content/interviewScript";
import { Button } from "../ui/Button";

export function InterviewScriptAccordion({ collapsible = true }: { collapsible?: boolean }) {
  const [open, setOpen] = useState<string | null>(INTERVIEW_SCRIPT[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggleChecked(key: string) {
    setChecked((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div>
      {INTERVIEW_SCRIPT.map((section) => {
        const isOpen = !collapsible || open === section.id;
        return (
          <div key={section.id} className="border-b border-border">
            <button
              onClick={() => collapsible && setOpen(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between py-2.5 text-left"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-text-primary">
                {section.title} <span className="text-text-muted">· {section.minutes} min</span>
              </span>
              {collapsible && (
                <ChevronDown size={14} className={clsx("text-text-muted transition-transform", isOpen && "rotate-180")} />
              )}
            </button>
            {isOpen && (
              <div className="pb-3">
                {section.intro && <p className="mb-2 font-body text-sm italic text-text-muted">{section.intro}</p>}
                <ul className="flex flex-col gap-1.5">
                  {section.questions.map((q, i) => {
                    const key = `${section.id}-${i}`;
                    return (
                      <li key={key} className="flex items-start gap-2 font-mono text-xs text-text-primary">
                        <input
                          type="checkbox"
                          checked={checked.has(key)}
                          onChange={() => toggleChecked(key)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#0F2419]"
                        />
                        <span className={clsx(checked.has(key) && "text-text-muted line-through")}>{q}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="mt-3" icon={<Printer size={12} />} onClick={() => window.print()}>
        Print / Export Script
      </Button>
    </div>
  );
}
