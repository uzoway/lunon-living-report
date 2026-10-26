# Lunon Living Report

A reading layer for Lunon Deep Research output: the report's evidence, one action away from every figure.

> Unofficial concept by Uzo Okafor. Not affiliated with Lunon. Report text from Lunon Deep Research (MIT), unmodified.

**Status:** in progress. Every feature is built; the full QA pass and the committed Playwright suite are next. [PRODUCT-NOTES.md](PRODUCT-NOTES.md) holds the brief and every decision so far.

## Why this exists

Deep Research writes strong reports, but the raw markdown leaves the reader to do the checking: 209 inline citation links, each showing the full source string, across about 10,900 words and 18 tables. **One typed report model drives every surface: the brief, the reader, the source index and the question list.**

## How it works

At build time, `parseReport()` reads `content/report-51.md` and returns a typed `Report`. The static page renders from it, and client components only add interaction state.

### Parsing rules

- **Citation:** a markdown link with an http(s) URL. Links with no text between them form one cluster, shown as one marker.
- **Source:** links are the same source when their URLs match after lowercasing the host and dropping the fragment. Sources are numbered by first appearance.
- **Domain:** the host without a leading `www.` (or `www8.`).
- **Year:** the first four-digit year from 1900 to 2026 in the label that isn't part of a range. A later year is a forecast horizon, not a publication date. No year is better than a wrong one.
- **Claim:** one sentence, split with `Intl.Segmenter` after citations are removed. A citation cluster belongs to the sentence it follows. The parser rejoins sentences the segmenter splits at "vs." before a number. Each table row is one claim.
- **Provenance:** only claims that contain a figure are labelled.
  - **Modeled** if the claim, its table's header, or the paragraph right before or after its table contains "model output", "internal model", "modeled", "(model" or "the model".
  - **Cited** otherwise, if the claim has a citation.
  - **Not attributed** if it has neither.
  - Modeled wins over cited, because a modeled figure often cites its inputs. Labels say where a figure points, never whether the source supports it.
- **Charts:** a table is charted when it's a numeric series with years across the header or down the first column. A series is charted only if every cell reads as a number once `~`, `¥`, `tn`, `%` and `+` are stripped. A bold total row makes the other rows its parts, drawn as small multiples. Percentage columns aren't drawn on an amounts axis; next to amounts they become labels. A "Scenario" table with one numeric column becomes a range bar.
- **Timeline:** the report's one mermaid `timeline` block is read into periods and events, without a Mermaid dependency.
- **Anything else** in the markdown throws at build time, so nothing is dropped silently.

## Running it locally

Needs Node 22.18 or later.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

The dev server serves the page at `localhost:3000/lunon-living-report/`.

## Credits and license

- Code: MIT, © 2026 Uzo Okafor. See [LICENSE](LICENSE).
- Report text: [Lunon Deep Research](https://github.com/LunonAI/lunon-deep-research), report 51 at commit `4c1d001`, © 2026 Lunon, MIT. Copied unmodified; see [content/NOTICE](content/NOTICE).
- Unofficial concept by Uzo Okafor. Not affiliated with Lunon.
