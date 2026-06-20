# Quarterly Re-run Runbook

How to refresh the Hidden Champions list each quarter so two runs stay
comparable and the list stays current. Budget ~half a day plus verification time.

## 0. Prep
```bash
git pull
python -m venv .venv && source .venv/bin/activate   # first time
pip install -r requirements.txt
```
- Decide the cycle tag, e.g. `2026-Q3`.
- Keep the **previous** `champions.db` and `output/` archived (see step 6) so you
  can diff against it.

## 1. Seed (refresh candidates)
Run each live connector for both sectors:
```bash
python run.py seed --source jumia  --sector ecommerce
python run.py seed --source kam    --sector manufacturing
python run.py seed --source tenders
```
`upsert_business` dedups by (name, sector), so re-seeding adds new businesses and
new signals without duplicating existing ones.

> Offline dry-run / smoke test anytime: `python run.py demo` (uses fixtures).

## 2. Footprint (refresh exclusions)
Wire a search backend in `footprint.search_hits` (SerpAPI/Bing) for real results,
then:
```bash
python run.py footprint --sector ecommerce
python run.py footprint --sector manufacturing
```
This re-checks every candidate against the [common databases](03-exclusion-criteria.md).
A business that got funded/covered since last quarter will now be gated out —
that's intended.

## 3. Score & profile
```bash
python run.py score   --sector ecommerce && python run.py score --sector manufacturing
python run.py profile          # set ANTHROPIC_API_KEY for LLM profiles, else template
```

## 4. Export & outreach
```bash
python run.py export           # output/top50.csv + output/profiles/*.md
python run.py outreach         # output/outreach_tracker.csv (preserves your CRM state)
```

## 5. Human verification
- Spot-check the new Top 50 against the [exclusion criteria](03-exclusion-criteria.md)
  additional disqualifiers (subsidiary, defunct, non-Kenyan, event attendee).
- Diff against last quarter: who entered, who dropped, and why (footprint gate vs.
  fundamentals shift). Record this in the changelog below.

## 6. Archive the cycle
```bash
mkdir -p archive/2026-Q3
cp champions.db archive/2026-Q3/
cp -r output     archive/2026-Q3/
```
Commit code/methodology changes (not the gitignored DB/output) with the cycle tag.

## 7. Changelog (append each cycle)
Record anything that affects comparability:

| Cycle | Date | Weight/threshold changes | Sources added | Notable list movement |
|---|---|---|---|---|
| 2026-Q3 | | | | |

## Maintenance checklist (when a connector breaks)
Marketplace/directory HTML drifts. When a connector returns nothing live:
1. Open the connector; its CSS selectors live in one `SELECTORS` dict.
2. Re-inspect the source page, update the selectors, re-run that `seed`.
3. If a source disappears entirely, mark it 📋 in [02-sources](02-sources.md) and
   lean on the others — the pipeline degrades gracefully, never crashes.
