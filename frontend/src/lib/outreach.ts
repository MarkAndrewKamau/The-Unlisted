import { founderName } from "./names";
import { mulberry32 } from "./rng";
import { getTop50 } from "./generateBusinesses";
import type { OutreachRecord, OutreachStatus } from "./types";

const SEED = 4471;

const STATUS_CYCLE: OutreachStatus[] = [
  "contacted", "identified", "identified", "responded", "identified",
  "interviewed", "identified", "joined", "identified", "identified",
];

const CHANNELS = ["WhatsApp", "Email", "Phone", "In-person visit"];

const NOTE_TEMPLATES: Record<OutreachStatus, string[]> = {
  identified: ["Not yet reached out — queued for next outreach batch.", "Found via KAM directory listing, no contact info confirmed yet."],
  contacted: ["Emailed via website contact form, awaiting reply.", "Sent WhatsApp intro message with profile link attached."],
  responded: ["Founder replied, open to a call next week.", "Quick reply — asked for more detail on the programme first."],
  interviewed: ["Completed 30-min call — strong founder story, verified tenders.", "Interviewed on-site, confirmed certification + longevity claims."],
  joined: ["Confirmed for the Q2 cohort — onboarding documents sent.", "Joined the network, intro made to first partner."],
  declined: ["Politely declined — too busy this quarter, follow up Q3.", "Not interested in outside visibility at this time."],
};

let _cache: OutreachRecord[] | null = null;

export function getOutreachRecords(): OutreachRecord[] {
  if (_cache) return _cache;
  const rand = mulberry32(SEED);
  const top10 = getTop50().slice(0, 10);
  _cache = top10.map((b, i) => {
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const hasContact = status !== "identified";
    const notes = NOTE_TEMPLATES[status][Math.floor(rand() * NOTE_TEMPLATES[status].length)];
    const firstContactedOffset = hasContact ? 2 + Math.floor(rand() * 10) : null;
    const lastTouchOffset = hasContact ? Math.max(0, (firstContactedOffset ?? 0) - Math.floor(rand() * 4)) : null;
    return {
      businessSlug: b.slug,
      founder: founderName(rand),
      contactChannel: hasContact ? CHANNELS[Math.floor(rand() * CHANNELS.length)] : "",
      contactHandle: hasContact ? `+254 7${Math.floor(rand() * 90000000 + 10000000)}` : "",
      status,
      firstContacted: firstContactedOffset ? `2026-06-${String(18 - firstContactedOffset).padStart(2, "0")}` : null,
      lastTouch: lastTouchOffset ? `2026-06-${String(18 - lastTouchOffset).padStart(2, "0")}` : null,
      owner: ["Mark", "Joy", "Brian"][Math.floor(rand() * 3)],
      notes,
    };
  });
  return _cache;
}

export function getOutreachFor(slug: string): OutreachRecord | undefined {
  return getOutreachRecords().find((r) => r.businessSlug === slug);
}

export const OUTREACH_COLUMNS: { id: OutreachStatus; label: string }[] = [
  { id: "identified", label: "Identified" },
  { id: "contacted", label: "Contacted" },
  { id: "responded", label: "Responded" },
  { id: "interviewed", label: "Interviewed" },
  { id: "joined", label: "Joined / Declined" },
];
