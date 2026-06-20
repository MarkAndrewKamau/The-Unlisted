# Data Ethics & Compliance Note

This project profiles real businesses (and, by extension, real people) from
public data. This note states the principles we hold to and the concrete rules
the pipeline follows.

## Principles

1. **Public-signal only.** We collect information businesses have already made
   public — directory listings, marketplace ratings, awarded-tender notices,
   registry records. We do not access private systems, scrape behind logins, or
   buy leaked/illicit data.
2. **Evidence, not invention.** Every quantitative claim traces to a stored
   `signal` row with a source URL and timestamp. The profile generator is
   instructed to use only provided evidence and to mark unknowns as
   _needs research_ rather than guess. We never fabricate facts about a business.
3. **Accuracy & right of reply.** Before publishing any profile, the founder is
   shown the draft and can correct or redact it ([interview script](05-interview-script.md)).
4. **Benefit to the subject.** The purpose is to make good businesses *more*
   visible and to invite them into a supportive network — not to expose,
   rank-shame, or surveil. Anyone can ask to be removed.

## Scraping conduct

- **Respect `robots.txt`** and site Terms of Service. Where a source disallows
  automated access, use its API, request permission, or collect manually.
- **Rate-limit and identify.** Connectors send a descriptive User-Agent and
  sleep between requests (`delay` kwarg). No aggressive crawling.
- **Minimal footprint.** Fetch only what feeds a scored signal; cache to avoid
  re-hitting sources. Don't mirror whole sites.
- **Marketplace/aggregator data** (Jumia, etc.) is used for coarse public
  signals (rating, count, tenure), not to copy proprietary content wholesale.

## Personal data (Kenya Data Protection Act, 2019)

- We focus on **business-level** information. Personal data (a founder's name,
  contact) is collected for **outreach** under legitimate-interest grounds and
  handled accordingly.
- **Contact details** gathered for outreach are stored in the outreach tracker,
  used only to reach the business, not redistributed, and deleted on request.
- **Consent for publication.** A person's background/quotes are published only
  with their agreement.
- **Data-subject rights.** Honour access, correction, and deletion requests
  promptly. Maintain a removal path (email + a note in the tracker).
- If processing scales, review whether registration with the Office of the Data
  Protection Commissioner (ODPC) is required.

## Retention & security

- The candidate database (`champions.db`) holds public business signals; the
  outreach tracker holds the limited personal data. Keep the tracker access-
  controlled and out of version control (it lives under `output/`, gitignored).
- Review collected personal data each quarterly cycle; purge contacts for
  businesses dropped from the list.

## Fairness

- Scores are sector-normalised and rule-based; weights are documented and
  applied uniformly. Human verification exists to catch data artefacts, not to
  hand-pick favourites.
- Be transparent about limitations: public signals are proxies, not audited
  financials. Profiles should not overstate certainty.
