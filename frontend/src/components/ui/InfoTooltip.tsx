import { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={12} className="text-text-muted" />
      {show && (
        <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded border border-border bg-forest px-2.5 py-1.5 text-[11px] font-body text-surface shadow-lift">
          {text}
        </span>
      )}
    </span>
  );
}

export function SectorNormalisationBadge({ sector, n }: { sector: string; n: number }) {
  return <InfoTooltip text={`Score normalised within ${sector} cohort of ${n} businesses.`} />;
}
