import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Link2 } from "lucide-react";
import { getOnchainStatus } from "@/lib/api";

const SNOWTRACE = "https://testnet.snowtrace.io/address/";

// Honest provenance badge:
//  - contract deployed (configured)  -> "Verified on Avalanche", links to Snowtrace
//  - root computed but not anchored -> muted "provenance root computed" (no false claim)
//  - API unreachable                -> renders nothing
export function OnchainBadge() {
  const { data: status } = useQuery({ queryKey: ["onchain-status"], queryFn: getOnchainStatus, retry: false });

  if (!status) return null;
  const shortRoot = `${status.current_root.slice(0, 10)}…${status.current_root.slice(-6)}`;

  if (status.configured && status.registry_address) {
    return (
      <a
        href={`${SNOWTRACE}${status.registry_address}`}
        target="_blank"
        rel="noreferrer"
        title={`Top-50 Merkle root ${status.current_root} anchored on Avalanche Fuji`}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 mono text-[11px] text-emerald-600 hover:bg-emerald-500/20"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified on Avalanche · {shortRoot}
      </a>
    );
  }

  return (
    <span
      title={`Provenance root ${status.current_root} computed (${status.champion_count} champions). Deploy ChampionRegistry to Fuji and publish to anchor it.`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 mono text-[11px] text-muted-foreground"
    >
      <Link2 className="h-3.5 w-3.5" />
      Provenance root computed · {shortRoot}
    </span>
  );
}
