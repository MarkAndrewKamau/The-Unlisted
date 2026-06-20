import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { FilterSidebar } from "../components/candidates/FilterSidebar";
import { CandidateTable, type SortKey } from "../components/candidates/CandidateTable";
import { CandidateDetailSlideOver } from "../components/candidates/CandidateDetailSlideOver";
import { applyFilters, countActiveFilters, DEFAULT_FILTERS, type CandidateFilters } from "../lib/filters";
import type { Business } from "../lib/types";

const PAGE_SIZES = [25, 50, 100];

export function Candidates() {
  const { businesses } = useApp();
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("hc_rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<Business | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const withSearch = { ...filters, search };
    const result = applyFilters(businesses, withSearch);
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "rank" || sortKey === "hc_rank") cmp = a.hc_rank - b.hc_rank;
      else cmp = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [businesses, filters, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="flex flex-col md:flex-row">
      <div className="border-b border-border p-4 md:hidden">
        <button
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 font-mono text-xs uppercase"
        >
          <Filter size={13} />
          Filters
          {countActiveFilters(filters) > 0 && (
            <span className="rounded-full bg-amber px-1.5 py-0.5 text-[10px] text-forest">
              {countActiveFilters(filters)}
            </span>
          )}
        </button>
      </div>

      <FilterSidebar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
        className={mobileFiltersOpen ? "block" : "hidden md:block"}
      />

      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text-primary">Candidate Database</h1>
            <p className="font-body text-sm text-text-muted">The analyst's working table.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search businesses..."
              className="w-full rounded border border-border bg-background py-2 pl-9 pr-3 font-mono text-xs italic placeholder:text-text-muted/70 focus:border-forest focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded border border-border bg-background">
          <CandidateTable
            rows={pageRows}
            rankOffset={(page - 1) * pageSize}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={setSelected}
          />
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-mono text-xs text-text-muted">
            {filtered.length === 0
              ? "0 candidates"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length.toLocaleString()} candidates`}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="font-mono text-xs text-forest disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="font-mono text-xs text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="font-mono text-xs text-forest disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <CandidateDetailSlideOver business={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
