// Structured transcription of docs/05-interview-script.md for the interactive
// checklist on the Outreach page.
export interface ScriptSection {
  id: string;
  title: string;
  minutes: number;
  intro?: string;
  questions: string[];
}

export const INTERVIEW_SCRIPT: ScriptSection[] = [
  {
    id: "opening",
    title: "Opening",
    minutes: 2,
    intro:
      '"Thanks for the time. We run The Unlisted — we\'ve been mapping Kenyan businesses with genuinely strong fundamentals that the startup-media world has somehow missed, and yours stood out. This isn\'t a sales call." State plainly: no obligation, we\'ll share their profile before anything is published.',
    questions: [],
  },
  {
    id: "story",
    title: "Story & Founder Background",
    minutes: 8,
    questions: [
      "How did the business start — what were you doing before?",
      "What did the first year look like? What nearly killed it early on?",
      "Who are the people behind it today — founders, key operators?",
      "What's kept you going when it would've been easier to stop?",
    ],
  },
  {
    id: "business-model",
    title: "Business Model",
    minutes: 8,
    questions: [
      "In plain terms, how do you make money — who pays, for what?",
      "Who are your customers, and how do they find you?",
      "What do you do that competitors don't, or won't?",
      "What does a normal month look like operationally?",
    ],
  },
  {
    id: "verify-signals",
    title: "Verify Signals",
    minutes: 8,
    intro: "Map each to what the pipeline observed; confirm or correct.",
    questions: [
      "How long have you been operating? (verify longevity_years)",
      "Roughly how many customers / orders in a typical month? (verify scale)",
      "How many locations / branches / staff today, and how has that changed? (growth)",
      "Any certifications, standards, or association memberships? (validation)",
      "We saw you've won public tenders — how big a part of the business is that?",
      "What's grown fastest in the last two years? What's your constraint to growing more?",
    ],
  },
  {
    id: "invisible",
    title: "Why They're Invisible",
    minutes: 4,
    questions: [
      "Have you ever been written about, raised outside money, or done startup events? (sanity-check obscurity)",
      "Was staying low-profile deliberate, or just never a priority?",
    ],
  },
  {
    id: "invitation",
    title: "The Invitation",
    minutes: 5,
    questions: [
      "We'd like to feature you in our Hidden Champions profiles — here's the draft, you approve before anything goes out. Open to that?",
      "We're building a network of operators like you — peer intros, occasional convenings, no fluff. Want in?",
      "Who else should be on this list?",
      "Best way and cadence to stay in touch?",
    ],
  },
];
