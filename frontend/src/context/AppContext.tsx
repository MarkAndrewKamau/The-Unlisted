import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { getAllBusinesses, getDisqualified } from "../lib/generateBusinesses";
import { getActivityLog, LAST_RUN } from "../lib/pipeline";
import { getOutreachRecords } from "../lib/outreach";
import type { ActivityEvent, Business, OutreachRecord, OutreachStatus } from "../lib/types";

export type SectorFilter = "all" | "ecommerce" | "manufacturing";
export type StageId = "seed" | "footprint" | "score" | "profile" | "export" | "outreach";

interface Toast {
  id: string;
  message: string;
  tone: "disqualify" | "success";
}

interface RunState {
  active: boolean;
  stage: StageId | null;
  sector: SectorFilter;
  lines: string[];
  done: boolean;
}

export type DataSource = "live" | "mock" | "loading";

interface AppContextValue {
  businesses: Business[];
  dataSource: DataSource;
  cycle: string;
  lastRun: string;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  activity: ActivityEvent[];
  addActivity: (event: Omit<ActivityEvent, "id">) => void;
  outreach: OutreachRecord[];
  updateOutreachStatus: (slug: string, status: OutreachStatus) => void;
  updateOutreachNotes: (slug: string, notes: string) => void;
  verifiedSlugs: Set<string>;
  markVerified: (slug: string) => void;
  disqualifiedSlugs: Set<string>;
  disqualifyManually: (slug: string, reason: string) => void;
  run: RunState;
  startRun: (stage: StageId, sector: SectorFilter) => void;
  cancelRun: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STAGE_SCRIPTS: Record<StageId, (sector: string) => string[]> = {
  seed: (sector) => [
    `$ python run.py seed --source jumia --sector ${sector}`,
    "[seed:jumia] connecting to source...",
    "[seed:jumia] 214 businesses, 1,926 signals collected",
    "[seed:kam] connecting to source...",
    "[seed:kam] 88 businesses, 792 signals collected",
    "done.",
  ],
  footprint: (sector) => [
    `$ python run.py footprint --sector ${sector}`,
    "[footprint] search backend: duckduckgo (free)",
    "[footprint] scanning 9 common databases per candidate...",
    "[footprint] wrote footprint rows for sector '" + sector + "'",
    "done.",
  ],
  score: (sector) => [
    `$ python run.py score --sector ${sector}`,
    "[score] normalising Quality dimensions within sector cohort...",
    "[score] applying exclusion gate (FOOTPRINT_DISQUALIFY=8)...",
    "[score] hc_rank = sqrt(Quality × Obscurity)",
    "[score] scored, ranked. see leaderboard.",
    "done.",
  ],
  profile: () => [
    "$ python run.py profile --sector " + "all",
    "[profile] ANTHROPIC_API_KEY not set — using template mode",
    "[profile] writing markdown profiles for finalists...",
    "done.",
  ],
  export: () => [
    "$ python run.py export",
    "[export] output/top50.csv",
    "[export] output/profiles/*.md",
    "done.",
  ],
  outreach: () => [
    "$ python run.py outreach",
    "[outreach] top-10 founder tracker -> output/outreach_tracker.csv",
    "[outreach] human-entered status/notes preserved on re-run",
    "done.",
  ],
};

export function AppProvider({ children }: { children: ReactNode }) {
  // Start from mock so the UI renders instantly and works offline, then try to
  // replace it with real data from the API. If the API is unreachable we stay on
  // mock (dev/offline); `dataSource` tells the UI which it's showing.
  const [businesses, setBusinesses] = useState<Business[]>(() => getAllBusinesses());
  const [dataSource, setDataSource] = useState<DataSource>("loading");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>(() => getActivityLog());
  const [outreach, setOutreach] = useState<OutreachRecord[]>(() => getOutreachRecords());

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [real, realOutreach] = await Promise.all([
          api.businesses(ctrl.signal),
          api.outreach(ctrl.signal).catch(() => null),
        ]);
        if (Array.isArray(real) && real.length) {
          setBusinesses(real);
          if (realOutreach && realOutreach.length) setOutreach(realOutreach);
          setDataSource("live");
        } else {
          setDataSource("mock");
        }
      } catch {
        setDataSource("mock"); // API down -> keep mock, never break the demo
      }
    })();
    return () => ctrl.abort();
  }, []);
  const [verifiedSlugs, setVerifiedSlugs] = useState<Set<string>>(new Set());
  const [disqualifiedSlugs, setDisqualifiedSlugs] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<RunState>({ active: false, stage: null, sector: "all", lines: [], done: false });

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addActivity = useCallback((event: Omit<ActivityEvent, "id">) => {
    setActivity((a) => [{ ...event, id: `${Date.now()}-${Math.random()}` }, ...a]);
  }, []);

  const updateOutreachStatus = useCallback((slug: string, status: OutreachStatus) => {
    setOutreach((rows) => rows.map((r) => (r.businessSlug === slug ? { ...r, status } : r)));
  }, []);

  const updateOutreachNotes = useCallback((slug: string, notes: string) => {
    setOutreach((rows) => rows.map((r) => (r.businessSlug === slug ? { ...r, notes } : r)));
  }, []);

  const markVerified = useCallback((slug: string) => {
    setVerifiedSlugs((s) => new Set(s).add(slug));
  }, []);

  const disqualifyManually = useCallback((slug: string, reason: string) => {
    setDisqualifiedSlugs((s) => new Set(s).add(slug));
    const b = businesses.find((x) => x.slug === slug);
    if (b) {
      addActivity({ timestamp: new Date().toISOString().slice(11, 16), message: `Disqualified: ${b.name} (${reason})`, tone: "disqualify" });
      setToasts((t) => [...t.slice(-2), { id: `${Date.now()}`, message: `${b.name} disqualified · manual review`, tone: "disqualify" }]);
    }
  }, [businesses, addActivity]);

  const cancelRun = useCallback(() => {
    setRun({ active: false, stage: null, sector: "all", lines: [], done: false });
  }, []);

  const startRun = useCallback((stage: StageId, sector: SectorFilter) => {
    const sectorArg = sector === "all" ? "all" : sector;
    const script = STAGE_SCRIPTS[stage](sectorArg);
    setRun({ active: true, stage, sector, lines: [], done: false });

    script.forEach((line, i) => {
      setTimeout(() => {
        setRun((r) => (r.active || i === 0 ? { ...r, active: true, lines: [...r.lines, line] } : r));
        if (i === script.length - 1) {
          setTimeout(() => {
            setRun((r) => ({ ...r, done: true }));
            if (stage === "footprint" || stage === "score") {
              const dq = getDisqualified().slice(0, 3);
              dq.forEach((b, idx) => {
                setTimeout(() => {
                  setToasts((t) => [...t.slice(-2), { id: `${b.id}-${Date.now()}`, message: `${b.name} disqualified · ${b.disqualifyReason.includes("database") ? "common database" : "footprint"}`, tone: "disqualify" }]);
                }, idx * 600);
              });
            }
            addActivity({ timestamp: new Date().toISOString().slice(11, 16), message: `Pipeline stage "${stage}" completed (${sector})`, tone: "success" });
          }, 400);
        }
      }, i * 450);
    });
  }, [addActivity]);

  const value = useMemo<AppContextValue>(() => ({
    businesses,
    dataSource,
    cycle: "2026-Q2",
    lastRun: LAST_RUN,
    toasts,
    dismissToast,
    activity,
    addActivity,
    outreach,
    updateOutreachStatus,
    updateOutreachNotes,
    verifiedSlugs,
    markVerified,
    disqualifiedSlugs,
    disqualifyManually,
    run,
    startRun,
    cancelRun,
  }), [businesses, dataSource, toasts, dismissToast, activity, addActivity, outreach, updateOutreachStatus, updateOutreachNotes, verifiedSlugs, markVerified, disqualifiedSlugs, disqualifyManually, run, startRun, cancelRun]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
