import type { ReactNode } from "react";
import clsx from "clsx";
import type { Sector } from "../../lib/types";

type Tone = "amber" | "terracotta" | "success" | "muted" | "dark";

const TONE_CLASSES: Record<Tone, string> = {
  amber: "bg-amber/15 text-amber border-amber/40",
  terracotta: "bg-terracotta/10 text-terracotta border-terracotta/40",
  success: "bg-success/10 text-success border-success/40",
  muted: "bg-border/40 text-text-muted border-border",
  dark: "bg-forest text-surface border-forest",
};

export function Badge({ children, tone = "muted", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const SECTOR_TONE: Record<string, Tone> = {
  ecommerce: "amber", retail: "amber",
  manufacturing: "success", agriculture: "success",
  food: "terracotta", services: "dark",
};
const SECTOR_LABEL: Record<string, string> = {
  ecommerce: "E-commerce", manufacturing: "Manufacturing", retail: "Retail",
  food: "Food", services: "Services", agriculture: "Agriculture",
};

export function SectorPill({ sector }: { sector: Sector }) {
  const tone = SECTOR_TONE[sector] ?? "muted";
  const label = SECTOR_LABEL[sector] ?? (sector ? sector[0].toUpperCase() + sector.slice(1) : "—");
  return <Badge tone={tone}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: "active" | "disqualified" | "pending" }) {
  if (status === "disqualified") return <Badge tone="terracotta">Disqualified</Badge>;
  if (status === "pending") return <Badge tone="muted">Pending</Badge>;
  return <Badge tone="success">Active</Badge>;
}
