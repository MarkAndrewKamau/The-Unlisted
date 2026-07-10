import type {
  Business,
  BusinessDetail,
  DocDetail,
  DocSummary,
  OutreachEntry,
  ActivityEvent,
  PipelineStats,
  StageId,
  StageRunResult,
} from "./types";

const BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CandidateFilters {
  sector?: string;
  status?: string;
  search?: string;
}

export function getCandidates(filters: CandidateFilters = {}) {
  const params = new URLSearchParams();
  if (filters.sector && filters.sector !== "all")
    params.set("sector", filters.sector);
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request<Business[]>(`/api/candidates${qs ? `?${qs}` : ""}`);
}

export function getCandidate(id: number) {
  return request<BusinessDetail>(`/api/candidates/${id}`);
}

export function getCandidateProfile(id: number) {
  return request<{ markdown: string }>(`/api/candidates/${id}/profile`);
}

export function verifyCandidate(id: number) {
  return request<{ status: string }>(`/api/candidates/${id}/verify`, {
    method: "POST",
  });
}

export function disqualifyCandidate(id: number, reason: string) {
  return request<{ status: string }>(`/api/candidates/${id}/disqualify`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function getTop50(n = 50) {
  return request<Business[]>(`/api/top50?n=${n}`);
}

export function getOutreach() {
  return request<OutreachEntry[]>("/api/outreach");
}

export function patchOutreach(
  id: number,
  body: { status?: string; notes?: string },
) {
  return request(`/api/outreach/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getPipelineStats() {
  return request<PipelineStats>("/api/pipeline/stats");
}

export function runStage(stage: StageId, sector?: string) {
  return request<StageRunResult>(`/api/pipeline/run/${stage}`, {
    method: "POST",
    body: JSON.stringify({ sector }),
  });
}

export function getActivity(limit = 50) {
  return request<ActivityEvent[]>(`/api/activity?limit=${limit}`);
}

export function getDocs() {
  return request<DocSummary[]>("/api/docs");
}

export function getDoc(slug: string) {
  return request<DocDetail>(`/api/docs/${slug}`);
}
