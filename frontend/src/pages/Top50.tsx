import { Download, FileArchive } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/Button";
import { RankedCard } from "../components/top50/RankedCard";
import { OnchainBadge } from "../components/top50/OnchainBadge";
import { exportAllProfilesMarkdown, exportTop50Csv } from "../lib/export";
import { generateProfileMarkdown } from "../lib/profileTemplate";

export function Top50() {
  const { businesses } = useApp();
  const total = businesses.length;
  const top50 = businesses
    .filter((b) => !b.disqualified)
    .sort((a, b) => b.hc_rank - a.hc_rank)
    .slice(0, 50);
  const avgQuality = top50.reduce((s, b) => s + b.quality, 0) / (top50.length || 1);
  const avgObscurity = top50.reduce((s, b) => s + b.obscurity, 0) / (top50.length || 1);

  return (
    <div>
      <div className="flex flex-col gap-4 bg-forest px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <span className="font-mono text-3xl font-medium text-amber">{top50.length}</span>
            <span className="ml-2 font-mono text-sm text-amber">Hidden Champions</span>
          </div>
          <span className="font-mono text-xs text-surface/50">from {total.toLocaleString()}+ candidates seeded</span>
          <span className="font-mono text-xs text-surface">avg Quality score: {avgQuality.toFixed(1)}</span>
          <span className="font-mono text-xs text-surface">avg Obscurity: {avgObscurity.toFixed(1)}</span>
          <OnchainBadge />
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={<Download size={13} />} onClick={() => exportTop50Csv(top50)}>
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="!text-surface !border-surface/30"
            icon={<FileArchive size={13} />}
            onClick={() => exportAllProfilesMarkdown(top50, generateProfileMarkdown)}
          >
            Export Profiles (.md)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 md:p-8">
        {top50.map((b, i) => (
          <RankedCard key={b.slug} business={b} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
