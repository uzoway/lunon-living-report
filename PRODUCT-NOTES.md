# Lunon Living Report: product notes

**Prototype:** Living Report, a reading layer for Lunon Deep Research output
**Repo:** `uzoway/lunon-living-report`
**Live URL:** `https://uzookafor.com/lunon-living-report/`
**Owner:** Uzo Okafor

These notes are the build brief for this prototype. They're kept up to date when a decision changes, and the [decisions log](#decisions-log) at the end records every change from the original brief.

---

## 0. Context

**Lunon.** Lunon calls itself an AI-native consulting firm. Clients bring a decision, such as an acquisition to diligence, a market to size or an operation to transform, and get a worked, evidenced answer in days. Its stated values are evidence over opinion, judgment that stays human, and speed as a discipline. Its job postings describe one platform that runs an engagement from scoping, through AI research and analysis, to reports and deliverables that clients open directly, and they name a client portal and a "living report".

**Lunon Deep Research (the engine this prototype reads from).**
- Open-sourced under MIT at `github.com/LunonAI/lunon-deep-research`.
- It ranks first on DeepResearch Bench (RACE overall 53.51, GPT-5.5 judge, June 2026).
- Pipeline: plan, research with five isolated specialists, write, edit. There is a separate fact-check pass on figures, dates and citations.
- Its scores by dimension:

| Dimension | Lunon | Best other system | Lunon leads? |
|---|---|---|---|
| Comprehensiveness | 54.10 | 52.58 | Yes |
| Insight | 55.29 | 52.94 | Yes |
| Instruction following | 53.92 | 53.87 | Yes |
| Readability | 50.41 | 53.20 (dalpha) | No |

- Readability is the only dimension where it doesn't lead. The README says the biggest single gain came from a whole-article readability rewrite.
- The output is one long markdown file. Citations are inline links whose visible text is the full source string, so the reading surface is still untouched.

**The question.** Uzo asked Lunon whether the client portal and the reports are built from the same underlying system, or are still separate. This prototype is one answer, shown rather than told.

---

## 1. Product manager pass

### The reader and the job
The reader is a PE partner or operating executive with a decision in front of them and a few minutes to spare. In order, they need to:

1. Get the answer and how sure it is.
2. Check any number that matters to them.
3. Raise a question back to the engagement team.
4. Act, or ask for more.

### The problem
Deep Research writes strong reports, but the raw output makes the reader do the checking work. In the chosen report:

- One sentence can carry three citations, each a source string of up to 90 characters (the engine cuts longer ones, sometimes mid-word), sitting right in the line of text.
- About 10,900 words cite 61 unique sources through 209 inline links in 180 runs, with 18 tables. The parser tests confirm these counts against the raw markdown.
- Figures from outside sources and figures from the report's own model look the same.
- The report marks some modeled numbers in plain text ("internal model output"), but only for a reader who stops to look.

### Reframe
This is not "make the report pretty." It's "make the evidence inspectable without slowing the read." A partner should be able to read at full speed, and any figure should be one action away from where it came from.

### The answer
One typed report model drives every surface: the brief, the reader, the source index and the question list. That's the "same underlying system" answer to the question above. The README says this in one sentence near the top.

### Content
- Use report 51 from `LunonAI/lunon-deep-research/submission/reports/51.md`: "Japan's Silver Economy 2020–2050: Elderly Demographics and Consumption Market-Size Analysis".
- It fits because:
  - It's a market-size question, which is core Lunon work.
  - It opens with a verdict.
  - It has scenarios, a bottom-up versus top-down reconciliation and named falsifiers.
  - It has dense inline citations and time-series tables that can be charted.
- Copy it **verbatim** from commit `4c1d00149087fd2b7703e84fbb707f08724aeaca`. Do not edit, fix or rewrite the report text. Credit it with Lunon's MIT copyright notice. The copy's git blob hash equals upstream's (see `content/NOTICE`).

### In scope
1. **Brief:** the answer, range, verdict and "what would change this answer", readable in under two minutes.
2. **Reader:** the full report, with citations collapsed into small numbered markers.
3. **Source card:** opens from any marker.
4. **Trace:** pick a source and step through every claim that cites it.
5. **Provenance labels:** cited, modeled, or not attributed.
6. **Charts:** for the numeric time-series tables, each with a table view.
7. **Questions:** pin a question to any claim, collect them in a panel, and copy or download them as Markdown.
8. **Basics:** light and dark themes, mobile, keyboard, screen reader.

### Out of scope (on purpose)
- Running the engine.
- Authentication or real client data.
- More than one report.
- Editing the report.
- An AI chat.
- A backend or multi-user collaboration.
- Analytics. The page collects no data.
- Lunon's logo or brand system.
- Any claim that a figure has been "verified". We show where a figure points, not whether the source supports it.

### How we'd know it works (if this were real)
- Time to state the headline and range after opening the page: under 2 minutes.
- Share of figures whose source is reachable in one action from the figure.
- Questions raised per read.
- Source cards opened per session.

**Guardrails:**
- Opening a source never shifts the text the reader is on.
- Trace never implies verification.
- Every provenance label follows the published rule in section 3.

### Honesty constraints
- Label the page: "Unofficial concept by Uzo Okafor. Not affiliated with Lunon. Report text from Lunon Deep Research (MIT), unmodified."
- Provenance labels are parser-derived and the UI must say so in one line.
- The report's Executive Summary table and its section 10.1 table give different figures for the same categories (for example Healthcare & Pharma ~35 → ~30+ marked Expand, against 18 → 30 in 10.1). Both are shown as written. The page doesn't comment on it, because that would be a verification claim.

---

## 2. Product designer pass

### Information hierarchy
1. **Brief (top of page):** every item here is pulled from the parsed report, never typed in.
   - Title, the headline estimate in the report's own words ("約140兆円 (range ¥125–155 trillion, 2050, nominal)") with the 10.3 range bar (125, 140, 155), and the verdict sentence.
   - The verdict table as a compact row list with Expand / Stable / Squeeze chips. The words carry the meaning; color is only a backup.
   - "What would change this answer": the three falsifiers from section 11.5.
   - An evidence line: "61 sources · N cited figures · N modeled · N not attributed". Its numbers come from the parser.
2. **Reader:** the full report, in section order.
3. **Sources index:** every unique source, grouped by domain, sorted by how often it's cited. The report ends with an empty "References" heading; it stays as written, and the index follows it, labelled as built by this page.
4. **Questions panel:** the reader's pinned questions.

### Layout
- **Desktop (about 1100px and up):**
  - Sticky outline on the left, with the current section marked.
  - Reading column in the middle at 64–72 characters.
  - Margin rail on the right where the source card opens beside the paragraph it belongs to, like a sidenote.
- **Tablet:** the outline moves into a top menu, and source cards open as popovers anchored to the marker.
- **Mobile:** one column. Source cards and the questions panel open as bottom sheets.

### Citations
- Replace each run of inline citation links with one small marker. Show the number for a single source and a count for a cluster (for example "3").
- Markers use tabular numerals and have at least a 24×24px hit area (WCAG 2.2 target size).
- The marker never wraps away from the word before it.

### Source card
- Contents:
  - the source label as written
  - the domain
  - the year, if one can be read from the label
  - "Cited N times in this report"
  - **Show every claim**, which starts a trace
  - **Open source**, which opens in a new tab
- Some labels in the engine output are cut off mid-word (for example "…Seoul Journal of"). Show them as they are, with the domain doing the identifying. Never invent the missing text.
- A source's short name is its number plus its domain, for example "[1] ipss.go.jp". No rule can turn every label into a name like "IPSS 2023" (that label starts with 国立社会保障・人口問題研究所), and the domain alone isn't unique: 61 sources share 50 domains.

### Trace
- Starting a trace tints every claim that cites that source.
- A slim bar shows "Claim 3 of 29 · [1] ipss.go.jp" with previous, next and close controls.
- Escape closes the trace. The state is kept in the URL so a traced view can be linked.

### Provenance
- Three states, each with a text label and a quiet style, never color alone:
  - **Cited:** the claim has a source link.
  - **Modeled:** the report itself says the figure is its own model output.
  - **Not attributed:** neither.
- Only claims that contain a figure get a label. A sentence like "The estimate rests on three falsifiable claims:" has nothing to attribute.
- A "Show provenance" toggle in the reader turns the labels on. They're off by default so the read stays calm. The brief always shows the totals.

### Charts
Only chart tables that are numeric series. Each chart has direct labels instead of a legend, tabular numerals, a short text summary for screen readers, and a Chart / Table toggle. Planned charts:

| Report section | Chart |
|---|---|
| 2.1, population by year | Two lines: total population and 65+ population |
| 10.1, category by year (2020–2050) | Stacked bars, or small multiples if stacked reads badly. Highlight that care and health carry almost all the growth. |
| 10.2, bottom-up vs top-down | Two lines with the divergence shown |
| 10.3, scenarios | One range bar: 125, 140, 155 |
| 12, cohort timeline | A simple timeline component |

Numbers never count up. This is evidence, not a landing page.

### Typography
Pick one face for long reading and one for UI, tables and numbers, and write the reasoning in the README. Starting point:
- **Source Serif 4** for body text. It has optical sizes for comfortable long reading.
- **Inter** for UI and data, with `tnum` turned on.

The report contains a lot of Japanese text (about 1,200 characters, for example 食料 and 約140兆円):
- Set a CJK fallback stack and check that the glyphs render at the same weight and baseline.
- Wrap Japanese runs in `lang="ja"`.

### Color
- Near-neutral palette, one accent for interactive and trace states, AA contrast in both themes.
- Don't copy Lunon's navy. A nod is fine; imitation isn't.

### Motion
Follow Emil Kowalski's rules: animate only when it helps the reader understand, and keep it under 300ms.

| Element | Motion |
|---|---|
| Source card or popover open | Scale 0.96 to 1 with opacity, 160ms, `cubic-bezier(0.23, 1, 0.32, 1)`, scaling from the trigger. Closing is faster than opening. |
| Trace highlight | Background tint fades in over 180ms. Stepping to the next claim scrolls smoothly, and that becomes instant under reduced motion. |
| Mobile sheet | `cubic-bezier(0.32, 0.72, 0, 1)` at about 300ms, with drag to dismiss. |
| Keyboard-repeated actions (next and previous in a trace, moving between markers) | No animation beyond the instant highlight |
| Reading text | Nothing moves while you read |
| Reduced motion | Everything becomes instant |

### States to design
- No questions yet.
- A long source label.
- A label cut off mid-word.
- A source with no parseable year.
- A cluster of 4 or more sources. The largest real cluster has 3, so this state is a test fixture.
- Japanese text inside English.
- A copy confirmation.
- A trace over a claim inside a table.

### Accessibility
- Landmarks and a skip link.
- Heading levels match the report.
- Visible focus everywhere.
- Popovers trap and return focus, and Escape closes them.
- A polite live region announces things like "Showing 29 claims that cite [1] ipss.go.jp".
- Every control can be used by keyboard.
- Markers have accessible names, for example "Sources: [1] ipss.go.jp and 2 more".

---

## 3. Design engineer pass

### Stack
Match the portfolio so both are reviewed against the same standard:
- Next.js 16 (App Router), React 19 and TypeScript in strict mode. Next is pinned to 16.4.3 because 16.3.0 has critical security advisories.
- Tailwind CSS 4 and `motion`.
- Radix primitives (Popover, Dialog).
- `unified`, `remark-parse` and `remark-gfm` for parsing.

Additions, each with its reason:
- `@types/mdast`: types for the markdown tree the parser walks. It was only a transitive dependency.
- `prettier`, set up like Google's `gts`: applies the Google style's formatting mechanically. `npm run lint` checks it.
- Playwright and `@axe-core/playwright` (added with the QA step): section 5 requires an automated suite and axe.

Tests use Node's built-in runner with type stripping, so `npm test` needs Node 22.18 or later and no extra tooling.

### Data flow
1. **Build time:** read `content/report-51.md` and run `parseReport()` to produce a typed `Report`.
2. The static page renders from `Report`.
3. Client components only add interaction state: the open source, the trace, the provenance toggle and the questions.

### Proposed structure
```
content/report-51.md        verbatim copy, plus content/NOTICE (Lunon MIT notice, source commit 4c1d001)
lib/report/types.ts         Report, Section, Block, Run, Citation, Source, Claim, Provenance
lib/report/parse.ts         markdown -> Report (pure)
lib/report/sources.ts       URL normalizing, label/year/domain parsing (pure)
lib/report/provenance.ts    claim classification (pure)
lib/report/tables.ts        numeric-series detection for charts (pure)
lib/report/content.ts       reads the report file at build time
lib/report/*.test.ts        node:test unit tests
lib/chart/scale.ts          shared linear scale and ticks for all charts (DRY)
app/page.tsx                server component: parse once, render
components/                 Brief, Reader, CitationMarker, SourceCard, SourcesIndex,
                            TraceBar, ProvenanceToggle, QuestionPin, QuestionsPanel,
                            charts/StackedBars, charts/Lines, charts/RangeBar, Timeline
```

### Parsing rules (each is written down in the README)
- **Citation:** an mdast `link` node with an http(s) URL. Adjacent citation links with no text between them form one cluster.
- **Source:**
  - Deduped by normalized URL (host in lowercase, fragment removed, everything else kept exactly).
  - The stable id is the order of first appearance.
  - The domain is the host without a leading `www.` (or `www8.`).
  - The year is the first four-digit year from 1900 to 2026 in the label that isn't part of a range (like 1995～2050). A later year is a forecast horizon ("Market Outlook 2033"), not a publication date. No year is better than a wrong one.
- **Claim:**
  - One sentence, split with `Intl.Segmenter` at sentence granularity, after citations are removed from the text. A claim's citations are the clusters attached to that sentence; a cluster belongs to the sentence it follows.
  - The segmenter wrongly ends a sentence at "vs." before a number ("91.35 vs. 84.95 years"), so the parser rejoins those. It's the only abbreviation in the report that trips it.
  - Each table row is one claim. Headings and the timeline are not claims.
- **Provenance:**
  - Only claims that contain a figure (any digit) are labelled.
  - Modeled: the claim, or its table's header, or the paragraph right before or after its table (markdown has no captions), contains "model output", "internal model", "modeled", "(model" or "the model".
  - Cited: otherwise, the claim has at least one citation.
  - Not attributed: neither.
  - Modeled wins over cited, because a modeled figure often cites its inputs and the citation is not the figure's source.
  - Known misses, kept rather than patched one phrase at a time: "±15% model uncertainty" (6.1, labelled cited) and the "Internal scenario" rows in the 7.3 and 8.3 tables (labelled not attributed).
  - The tests use real sentences from the report for each state.
- **Chartable table:** a numeric series in either orientation, with four-digit years across the header row (as in 10.1) or down the first column (as in 10.2 and 2.1). A series is charted only if all its cells read as numbers once `~`, `¥`, `tn`, `%` and `+` are stripped. Text columns such as "Basis" or "Driver" stay in the table view only.
  - Years across: each row is a series. A bold row is the total; with one, the chart is stacked bars and the total is the bar-end label, not a segment. Without one, lines.
  - Years down: each numeric column is a series. Percentage columns can't share an axis with amounts, so they're charted only when nothing else is (10.2's Divergence column stays in the table).
  - Scenarios: a table whose first column is "Scenario" and that has exactly one numeric column is a range bar. Only 10.3 matches; 5.3 and 6.3 have ranges like "~13–15" and stay tables.
  - Any table that doesn't match these rules stays a table.
- **Mermaid:** parse the single `timeline` block into `{ title, periods: { period, events[] }[] }` and render it with the Timeline component. Don't add a Mermaid dependency.
- **Thematic breaks:** dropped. Every one sits right before a top-level heading, which already separates the text.
- **Anything else** (an unknown block or inline node) throws at build time, so nothing can be dropped silently.

### State
- React state for UI.
- The URL (`?trace=s12#s-10-2`) for anything worth sharing.
- `localStorage` for questions, with every read and write in try/catch, and a page that still works when storage isn't available.

### Performance
- No re-rendering of the report on hover.
- No layout shift when cards open: the margin rail reserves its space, and popovers use portals.
- Fonts self-hosted through `next/font`.
- Lighthouse Performance and Accessibility at 95 or above on mobile.

### Code standards
- **KISS and DRY.** One parser, one scale helper, one popover pattern. No abstractions written "for later".
- Follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html):
  - named exports (Next.js config, pages and layouts need default exports, which is the only exception)
  - no `any`
  - `const` by default
  - descriptive names
  - comments that explain why, not what
- Review your own diff against Google's [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html): design, functionality, complexity (watch for over-engineering), tests, naming, comments, style.
- Keep parsing and classification as small pure functions with unit tests. Components only render and handle events.
- ESLint must pass with zero warnings, and `tsc --noEmit` must pass.

### Skills to use
Use whichever of these Emil Kowalski skills are installed (from `github.com/emilkowalski/skills`), plus the frontend-design skill for the typography and color direction:

| Skill | When to use it |
|---|---|
| `emil-design-eng` | Overall UI polish and component decisions |
| `animate` | Each animation in the motion section above |
| `apple-design` | Typography details and sheet behavior |
| `mobile-native` | The mobile layout and bottom sheets |
| `review-animations`, `animation-performance` | QA |
| `break-ui` | QA |

---

## 4. Repo, README and hosting

### New repo
- `uzoway/lunon-living-report`, **public**. It's linked from the message to Lunon, and the portfolio deploy needs to check it out.
- Includes `LICENSE` (MIT, Uzo's code) and `content/NOTICE` (Lunon's MIT copyright notice for the report text).

### Standard README
Sections in this order:
1. Title and a one-line description.
2. Live link.
3. A screenshot or short GIF.
4. Why this exists: the reading layer for Deep Research, and the "one model, every surface" sentence.
5. What it does: the features.
6. How it works: the data flow and the parsing rules.
7. Design decisions: typography, provenance and motion, a few lines each.
8. Accessibility.
9. Tech stack.
10. Running it locally (`npm ci`, `npm run dev`, `npm test`, `npm run build`).
11. Project structure.
12. Credits and license, including the not-affiliated line.

### Hosting at `uzookafor.com/lunon-living-report/`
The portfolio (`design-eng-prototypes`) deploys a static export to GitHub Pages with the custom domain uzookafor.com. There's no public `uzoway.github.io` user-site repo, so a new repo's own Pages site would **not** inherit the domain at a subpath. Instead:

1. In this repo, `next.config` sets:
   - `output: "export"`
   - `basePath: "/lunon-living-report"`
   - `trailingSlash: true`
   - `images: { unoptimized: true }`
2. In `design-eng-prototypes/.github/workflows/deploy.yml`, after "Build static site" (ask Uzo before making this change):
   - check out `uzoway/lunon-living-report` into `./lunon-living-report`
   - run `npm ci && npm run build` there
   - copy `lunon-living-report/out` to `./out/lunon-living-report`

   This workflow edit is the **only** change to the portfolio repo.
3. After pushing the prototype, re-run the portfolio deploy (it already has `workflow_dispatch`).
4. Keep the prototype off the Lab page for now. Uzo will decide whether to list it after sending it.
5. Before deploying, test the subpath locally: serve a folder that contains `lunon-living-report/` with the exported files inside, and confirm every asset, font and route loads under the prefix.

Two things to know: the portfolio deploy builds whatever is on this repo's `main` at that moment, and a push here isn't live until the portfolio deploy runs again.

---

## 5. QA before calling it done

Don't report the work as finished until every check below passes. Write the results to `QA.md` in the repo (check, how it was tested, result, any fix made). When a check fails, fix it and re-run the whole section it belongs to. A check that can't be run here (for example VoiceOver on iOS, or a real iOS or Android device) is listed as **needs Uzo**, never as passed.

### Data integrity (automated, in unit tests)
- The citation link count, unique source count and table count match the markdown, counted independently of the parser.
- Every citation in the markdown maps to exactly one source in the index, and every source is cited at least once.
- The brief's evidence numbers equal the parser's totals.
- The rendered text, with markers removed, matches the source text: nothing dropped, nothing reworded.
- Every chart's values equal its table's values.
- Provenance tests use real sentences from report 51 for each state.

### Functionality
- Every marker opens the right source.
- Clusters list every source.
- Open source goes to the exact URL.
- Trace steps through every claim, including claims inside tables, and survives a reload from the URL.
- Escape and the close button always clear the state.
- Questions can be added, edited and deleted, and survive a reload. Copy and download produce valid Markdown. The page still works with storage blocked.
- The provenance toggle shows correct labels.
- The outline tracks the current section.
- Deep links to sections work.

### UI
Check at 320, 375, 768, 1024, 1280 and 1440px, in light and dark, on the latest Safari, Chrome and Firefox (plus iOS Safari and Android Chrome, which need Uzo):
- no horizontal scroll
- no clipped or overlapping text
- the reading measure holds
- tables scroll inside their own container on small screens
- the Japanese glyphs render correctly
- the margin rail never covers text

Then run `break-ui` with worst-case data: very long labels, truncated labels, ten-source clusters, empty question text, very long questions.

### Animation
- Run `review-animations` and `animation-performance`.
- Check every animation at 0.25x speed for timing and origin. Here that's done by slowing animations through Playwright and checking frames, not by recording DevTools by hand.
- No `transition: all`, nothing scales from 0, nothing animates on keyboard-repeated actions.
- Reduced motion makes everything instant.
- No frame drops in a Performance trace while scrolling and tracing.

### Accessibility
- axe-core (through Playwright) reports zero violations on every state.
- Full keyboard run: no traps, visible focus, logical order.
- VoiceOver on macOS and iOS: markers, cards, trace and live-region announcements make sense spoken aloud (needs Uzo; the accessibility tree is checked here).
- Contrast is AA in both themes.
- Targets are at least 24×24px.

### Performance and build
- Lighthouse mobile scores 95 or above for Performance, Accessibility and Best Practices.
- No layout shift when opening cards (CLS 0.0 for those interactions).
- `npm run lint`, `tsc --noEmit`, `npm test` and `npm run build` are all clean.
- The page works under the `/lunon-living-report/` prefix locally and on the live domain.

### Automation
A Playwright suite that:
- walks the main flows (open a source, trace, pin a question, toggle provenance, switch the theme)
- takes screenshots at each viewport in both themes
- runs axe

It's committed so it can be re-run.

## 6. Done means

- The live URL works on mobile and desktop.
- The repo has a standard README and `QA.md`, all checks pass, and the tests are committed.
- Report text is unmodified and credited.
- The README makes the one-model, every-surface point in its first screen.
- Nothing claims verification the prototype doesn't do.

---

## Decisions log

**2026-10-26, before the build**
1. These notes are public, so section 0 keeps only product context: Lunon, the engine and the question. The full research brief stays local.
2. Provenance: modeled wins over cited; only claims with a figure are labelled; the paragraph before or after a table stands in for its caption; each table row is one claim; "the model" was added to the phrases after checking it doesn't over-match (it catches "The model projects a ¥28 trillion care line" in 11.5).
3. Charts: percentage columns aren't drawn on an amounts axis, and a bold total row becomes the stack's end label, not a segment.
4. The report's Executive Summary and 10.1 figures disagree. Both are shown verbatim, without comment.
5. The Brief is pulled from the parsed report, so its headline uses the report's own words.
6. A source's short name is its number plus its domain.
7. Corrections to the original brief: labels are up to 90 characters, not over 100; the largest real cluster is 3; the report ends with an empty "References" heading, which the Sources index follows.
8. Hosting: noted that the portfolio deploy builds this repo's `main` as it is at deploy time.
9. QA: checks that need a real device or VoiceOver are marked "needs Uzo". Playwright's Firefox will be installed for the cross-browser run.

**2026-10-26, step (a): parser and types**
10. Next.js pinned to 16.4.3, not 16.3.0, because of critical security advisories against 16.0.0–16.4.0.
11. Prettier added with `gts` settings to apply the Google style's formatting.
12. The parser rejoins sentences that `Intl.Segmenter` splits at "vs." before a number.
13. Thematic breaks are dropped (each one sits right before a top-level heading). A test checks that.
14. Population table 2.1 is charted as two lines (total and 65+). Its 高齢化率 column has a range ("~36–37"), so it stays in the table.

---

## Sources

- Lunon: [Founding Design Engineer posting](https://lunon.ai/company/careers/founding-design-engineer), [About](https://lunon.ai/company/about), [Deep Research announcement](https://lunon.ai/company/newsroom/lunon-deep-research-ranks-first-on-deep-research-bench)
- Repo: [LunonAI/lunon-deep-research](https://github.com/LunonAI/lunon-deep-research) (README, `assets/data/leaderboard_gpt55.json`, `submission/`)
- Standards and skills: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), [Google: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html), [Emil Kowalski skills](https://github.com/emilkowalski/skills), [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
