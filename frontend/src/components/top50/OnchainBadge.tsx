import { useEffect, useState } from "react";
import { ShieldCheck, Link2 } from "lucide-react";
import { api, type OnchainStatus } from "../../lib/api";

const SNOWTRACE = "https://testnet.snowtrace.io/address/";

// Honest provenance badge:
//  - contract deployed (configured)  -> "Verified on Avalanche", links to Snowtrace
//  - root computed but not anchored  -> muted "provenance root computed" (no false claim)
//  - API down / no data              -> renders nothing
export function OnchainBadge() {
  const [status, setStatus] = useState<OnchainStatus | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api.onchainStatus(ctrl.signal).then(setStatus).catch(() => setStatus(null));
    return () => ctrl.abort();
  }, []);

  if (!status) return null;
  const shortRoot = `${status.current_root.slice(0, 10)}…${status.current_root.slice(-6)}`;

  if (status.configured && status.registry_address) {
    return (
      <a
        href={`${SNOWTRACE}${status.registry_address}`}
        target="_blank"
        rel="noreferrer"
        title={`Top-50 Merkle root ${status.current_root} anchored on Avalanche Fuji`}
        className="inline-flex items-center gap-1.5 rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300 hover:bg-emerald-400/20"
      >
        <ShieldCheck size={13} />
        Verified on Avalanche · {shortRoot}
      </a>
    );
  }

  return (
    <span
      title={`Provenance root ${status.current_root} computed. Deploy ChampionRegistry to Fuji and publish to anchor it.`}
      className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-surface/60"
    >
      <Link2 size={13} />
      Provenance root computed · {shortRoot}
    </span>
  );
}
