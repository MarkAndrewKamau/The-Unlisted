// Real backend client. Talks to the FastAPI service (server.py).
// Base URL comes from VITE_API_BASE; defaults to local dev.
import type { Business, OutreachRecord } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "")
  ?? "http://localhost:8000";

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export interface OnchainStatus {
  configured: boolean;
  network: string;
  chain_id: number;
  registry_address: string;
  current_root: string;
  champion_count: number;
}

export interface Meta {
  serving_real: boolean;
  db_path: string | null;
}

export const api = {
  base: API_BASE,
  businesses: (signal?: AbortSignal) => getJSON<Business[]>("/api/businesses", signal),
  outreach: (signal?: AbortSignal) => getJSON<OutreachRecord[]>("/api/outreach", signal),
  meta: (signal?: AbortSignal) => getJSON<Meta>("/api/meta", signal),
  onchainStatus: (signal?: AbortSignal) => getJSON<OnchainStatus>("/api/onchain/status", signal),
  health: (signal?: AbortSignal) => getJSON<{ status: string }>("/api/health", signal),
  rerun: () => fetch(`${API_BASE}/api/pipeline/rerun`, { method: "POST" }).then((r) => r.json()),
};
