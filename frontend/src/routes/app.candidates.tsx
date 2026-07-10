import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getCandidates } from "@/lib/api";
import type { Business, Sector, Status } from "@/lib/types";
import { Search, X } from "lucide-react";

interface CandidatesSearch {
  sector?: Sector;
  status?: Status;
}

export const Route = createFileRoute("/app/candidates")({
  head: () => ({ meta: [{ title: "Candidates · The Unlisted" }] }),
  validateSearch: (search: Record<string, unknown>): CandidatesSearch => ({
    sector: SECTORS.includes(search.sector as Sector) ? (search.sector as Sector) : undefined,
    status: STATUSES.includes(search.status as Status) ? (search.status as Status) : undefined,
  }),
  component: CandidatesPage,
});

const SECTORS: Sector[] = [
  "ecommerce",
  "manufacturing",
  "agriculture",
  "logistics",
];
const STATUSES: Status[] = ["active", "disqualified"];

function CandidatesPage() {
  const searchParams = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => getCandidates(),
  });
  const all = data ?? [];
  const rankById = useMemo(
    () => new Map(all.map((b, i) => [b.id, i + 1])),
    [all],
  );

  const [q, setQ] = useState("");
  const [sectors, setSectors] = useState<Set<Sector>>(
    () => new Set(searchParams.sector ? [searchParams.sector] : []),
  );
  const [statuses, setStatuses] = useState<Set<Status>>(
    () => new Set(searchParams.status ? [searchParams.status] : []),
  );

  // Sidebar sub-section links navigate here with a new sector/status search
  // param even when already on this page — sync the filter sets when they change.
  useEffect(() => {
    if (searchParams.sector) setSectors(new Set([searchParams.sector]));
  }, [searchParams.sector]);
  useEffect(() => {
    if (searchParams.status) setStatuses(new Set([searchParams.status]));
  }, [searchParams.status]);
  const [minQ, setMinQ] = useState(0);
  const [minO, setMinO] = useState(0);
  const [sortKey, setSortKey] = useState<
    "rank" | "quality" | "obscurity" | "hc_rank"
  >("hc_rank");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [active, setActive] = useState<Business | null>(null);

  const rows = useMemo(() => {
    const r = all.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (sectors.size && !sectors.has(b.sector)) return false;
      const status: Status = b.disqualified ? "disqualified" : "active";
      if (statuses.size && !statuses.has(status)) return false;
      if ((b.quality ?? 0) < minQ) return false;
      if ((b.obscurity ?? 0) < minO) return false;
      return true;
    });
    r.sort((a, b) => {
      const va =
        sortKey === "rank" ? (rankById.get(a.id) ?? 0) : (a[sortKey] ?? 0);
      const vb =
        sortKey === "rank" ? (rankById.get(b.id) ?? 0) : (b[sortKey] ?? 0);
      return dir === "asc" ? va - vb : vb - va;
    });
    return r;
  }, [all, q, sectors, statuses, minQ, minO, sortKey, dir, rankById]);

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, v: T) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    setter(n);
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <p className="mono text-xs uppercase tracking-[0.35em] text-amber mb-3">
          Candidate database
        </p>
        <h1 className="font-display text-4xl text-foreground">
          All candidates
        </h1>
        <p className="mt-2 text-foreground/70">
          {all.length.toLocaleString()} businesses across all pipeline stages.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Filter sidebar */}
        <aside className="space-y-6 rounded-xl border border-border bg-card p-5 h-fit">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Search
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Business name…"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
          </div>
          <FilterGroup label="Sector">
            {SECTORS.map((s) => (
              <Chip
                key={s}
                active={sectors.has(s)}
                onClick={() => toggle(sectors, setSectors, s)}
              >
                {s}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Status">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                active={statuses.has(s)}
                onClick={() => toggle(statuses, setStatuses, s)}
              >
                {s}
              </Chip>
            ))}
          </FilterGroup>
          <RangeGroup label="Min quality" value={minQ} onChange={setMinQ} />
          <RangeGroup label="Min obscurity" value={minO} onChange={setMinO} />
        </aside>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="mono text-xs text-muted-foreground">
              {rows.length} of {all.length} candidates
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {[
                    { k: "rank", l: "Rank" },
                    { k: null, l: "Business" },
                    { k: null, l: "Sector" },
                    { k: "quality", l: "Qual" },
                    { k: "obscurity", l: "Obs" },
                    { k: "hc_rank", l: "HC" },
                    { k: null, l: "Status" },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left ${h.k ? "cursor-pointer hover:text-foreground" : ""}`}
                      onClick={() => {
                        if (!h.k) return;
                        if (sortKey === h.k)
                          setDir(dir === "asc" ? "desc" : "asc");
                        else {
                          setSortKey(h.k as typeof sortKey);
                          setDir("desc");
                        }
                      }}
                    >
                      {h.l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const status: Status = b.disqualified
                    ? "disqualified"
                    : "active";
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setActive(b)}
                      className={`border-t border-border hover:bg-muted/30 cursor-pointer ${
                        status === "disqualified" ? "opacity-50" : ""
                      }`}
                    >
                      <td
                        className={`px-4 py-3 mono ${status === "disqualified" ? "line-through" : ""}`}
                      >
                        #{rankById.get(b.id)}
                      </td>
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 mono text-xs uppercase tracking-widest text-muted-foreground">
                        {b.sector}
                      </td>
                      <td className="px-4 py-3 mono">{b.quality}</td>
                      <td className="px-4 py-3 mono">{b.obscurity}</td>
                      <td className="px-4 py-3 font-display text-lg text-forest">
                        {b.hc_rank}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {active && (
        <CandidateDetail
          biz={active}
          rank={rankById.get(active.id) ?? 0}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded border transition ${
        active
          ? "bg-forest text-forest-foreground border-forest"
          : "border-border text-muted-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

function RangeGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        <span>{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-forest"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "active"
      ? "bg-forest/10 text-forest border-forest/30"
      : "bg-terracotta/10 text-terracotta border-terracotta/30";
  return (
    <span
      className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}
    >
      {status}
    </span>
  );
}

function CandidateDetail({
  biz,
  rank,
  onClose,
}: {
  biz: Business;
  rank: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border-l border-border overflow-auto p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              #{rank} · {biz.sector}
            </p>
            <h3 className="font-display text-2xl text-foreground mt-1">
              {biz.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {biz.town}
              {biz.registry_year ? ` · since ${biz.registry_year}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Qual", v: biz.quality, color: "text-forest" },
            { l: "Obs", v: biz.obscurity, color: "text-amber" },
            { l: "HC", v: biz.hc_rank, color: "text-forest" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-border p-3">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.l}
              </div>
              <div className={`font-display text-2xl ${s.color}`}>{s.v}</div>
            </div>
          ))}
        </div>

        {biz.disqualified && biz.reason && (
          <div className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/10 p-3">
            <div className="mono text-[10px] uppercase tracking-widest text-terracotta">
              Disqualified
            </div>
            <p className="text-sm text-foreground mt-1">{biz.reason}</p>
          </div>
        )}

        <div className="mt-6">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Score breakdown
          </p>
          <div className="space-y-3">
            {biz.dimensions.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-xs">
                  <span>
                    {d.name}{" "}
                    <span className="text-muted-foreground">
                      · {Math.round(d.weight * 100)}%
                    </span>
                  </span>
                  <span className="mono">{d.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                  <div
                    className="h-full bg-forest"
                    style={{ width: `${d.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/app/profile/$id"
          params={{ id: String(biz.id) }}
          className="mt-6 block text-center rounded-md bg-forest text-forest-foreground py-2.5 text-sm font-medium hover:opacity-90"
        >
          View full profile →
        </Link>
      </div>
    </div>
  );
}
