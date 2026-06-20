import clsx from "clsx";
import { ShieldAlert } from "lucide-react";
import { COMMON_DATABASES, STRONG_EXCLUDERS } from "../../lib/constants";
import type { Business } from "../../lib/types";

export function FootprintCheck({ business }: { business: Business }) {
  const hitsByDomain = new Map(business.footprint.map((f) => [f.source, f.hits]));

  return (
    <div>
      <table className="w-full">
        <tbody>
          {Object.entries(COMMON_DATABASES).map(([domain, label]) => {
            const hits = hitsByDomain.get(domain) ?? 0;
            const strong = STRONG_EXCLUDERS.has(domain);
            const tone = hits === 0 ? "text-success" : hits <= 3 ? "text-amber" : "text-terracotta";
            return (
              <tr key={domain} className="border-b border-border/60">
                <td className="py-1.5 font-body text-xs text-text-primary">
                  {label}
                  {strong && <span className="ml-1 font-mono text-[10px] text-terracotta">(strong excluder)</span>}
                </td>
                <td className={clsx("py-1.5 text-right font-mono text-xs font-medium", tone)}>{hits}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {business.disqualified && (
        <div className="mt-3 flex items-start gap-2 rounded border border-terracotta/40 bg-terracotta/10 px-3 py-2">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-terracotta" />
          <p className="font-mono text-xs text-terracotta">{business.disqualifyReason}</p>
        </div>
      )}
    </div>
  );
}
