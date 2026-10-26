# QA

Every check from section 5 of [PRODUCT-NOTES.md](PRODUCT-NOTES.md), how it was tested, and the result. Run on 26 October 2026 against the static export served under `/lunon-living-report/`.

**Browsers:** Chrome 155 (installed), WebKit 27.2 (Safari's engine, Playwright build 2370), Firefox 157 (Playwright build 1555), on macOS. **Tools:** Node 26 (CI builds on Node 22), Playwright 1.64.1, axe-core 4.14, Lighthouse 12.8.2.

**To re-run:** `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:perf`. To run the browser suite against the live site: `BASE_URL=https://uzookafor.com/lunon-living-report/ npm run test:e2e`. Lighthouse was run with its Node API against `npm run preview` and against the live URL.

**Result:** every check that can run here passes, locally and on the live site: 64 unit tests, 182 browser tests in three browsers (4 skipped where a browser lacks the API), the perf test, and Lighthouse (95 / 100 / 100 locally, a median of 99 / 100 / 100 live). Checks that need a real device or VoiceOver are marked **Needs Uzo**.

## Data integrity (unit tests)

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| Link, source and table counts match the markdown, counted without the parser | `lib/report/parse.test.ts` counts with regular expressions over the raw file: 209 links, 61 sources, 18 tables, 180 citation runs | Pass | — |
| Every citation maps to exactly one source; every source is cited | Same file: each raw link resolves to one source with its label as written, and each source's count equals its links | Pass | — |
| The Brief's evidence numbers equal the parser's totals | `brief.test.ts` against `countEvidence`, and `tests/integrity.spec.ts` reads the rendered line: "61 sources · 104 cited figures · 23 modeled · 139 not attributed" | Pass | — |
| The rendered text, markers removed, matches the source: nothing dropped or reworded | Unit test on the model, and `integrity.spec.ts` on the page: every word of the title and report in order, compared with the markdown stripped by regular expressions. The timeline is checked line by line | Pass | — |
| Every chart's values equal its table's | `parse.test.ts` finds each chart value in its table cell by row and column label; 10.1's parts add up to its total every year | Pass | Labels now keep the table's decimals ("36.0", not "36") |
| Provenance tests use real sentences for each state | `provenance.test.ts`: six real sentences (cited, modeled, modeled over cited, "the model", not attributed, no figure) plus two table rows, each looked up in the parsed report | Pass | — |

The report itself is untouched: `git hash-object content/report-51.md` gives `bbd3dbb1…`, the same blob as upstream at commit `4c1d001`.

## Functionality

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| Every marker opens the right source | `integrity.spec.ts` clicks all 180 markers (with every chart in table view) and compares each card's title and links with the model | Pass, 3 browsers | — |
| Clusters list every source | Same test: cluster cards list each source in order | Pass | — |
| Open source goes to the exact URL | Same test: every `href` equals the URL as written in the report | Pass | — |
| Trace steps through every claim, tables included, and survives a reload | `flows.spec.ts` walks all 29 claims citing source 1 in order, each in view (rows in charted tables switch to table view), then reloads at claim 29 | Pass, 3 browsers | — |
| Escape and the close button always clear the state | `flows.spec.ts` (trace: Escape and Close; card: Escape returns focus to the marker) | Pass | Closing a panel no longer steals focus from a card opened during its exit animation |
| Questions: add, edit, delete, survive a reload | `flows.spec.ts`: pin from a sentence, edit, delete, undo, reload, pin any claim from the panel's list | Pass, 3 browsers | The edit box now starts with the caret at the end |
| Copy and download produce valid Markdown | The download is parsed with remark (headings, quote, question); in Chrome the clipboard text equals the download | Pass | — |
| The page works with storage blocked | `flows.spec.ts` throws on every `localStorage` access: questions still work for the visit, the panel says so, no errors | Pass | — |
| The provenance toggle shows correct labels | `flows.spec.ts` compares the label on each of the 444 claims with the parser's | Pass | — |
| The outline tracks the current section | `integrity.spec.ts` scrolls to each of the 14 top-level sections | Pass | Tracking now runs on scroll; the first version missed jumps that skipped its band |
| Deep links to sections work | `integrity.spec.ts` follows all 56 section anchors; each lands just below the sticky header | Pass | — |
| Every asset loads under the prefix | `flows.spec.ts`: no failed requests or console errors, and every request is under `/lunon-living-report/` (the test server 404s anything else) | Pass, 3 browsers | — |

## UI

Checked at 320, 375, 768, 1024, 1280 and 1440px, light and dark, in Chrome, WebKit and Firefox (`tests/layout.spec.ts`, which saves a screenshot of each). I reviewed the screenshots for clipped or overlapping text.

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| No horizontal scroll | Every width and theme, also with all provenance labels shown and every chart as a table | Pass | Long Japanese phrases and long domains no longer push 320–375px wide |
| No clipped or overlapping text | Header controls never overlap (measured); screenshots reviewed at every width | Pass | Short Japanese words no longer break mid-word; year ranges stay on one line |
| The reading measure holds | Characters per line measured from the rendered text at 768–1440px: median 64–67 | Pass | Column widened from 36 to 37rem |
| Tables scroll in their own container on small screens | At 320 and 375px at least one table scrolls inside its box while the page doesn't | Pass | — |
| Japanese renders correctly | Every Japanese run in the page is inside `lang="ja"` (tested); glyphs checked in screenshots at matching weight in light and dark | Pass | Chart summaries now mark their Japanese |
| The margin rail never covers text | At 1280 and 1440px, cards for the first, a middle and the last source sit right of the reading column and inside the window | Pass | — |
| iOS Safari and Android Chrome | Phone layouts run in WebKit and Chrome at 375px with touch, but not on devices | **Needs Uzo** | — |

**Worst-case data** (`tests/break.spec.ts`; the `break-ui` skill isn't installed, so these are the cases the brief lists): a ten-source cluster lists all ten and scrolls inside the card; a 664-character label ending in a 160-character unbroken word wraps inside the card; a label cut off mid-word ("…Seoul Journal of") is shown as written with no invented year; empty and whitespace-only questions can't be saved; a 2,300-character question with a 300-character unbroken word wraps in the panel. All pass on desktop and phone, in three browsers.

## Animation

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| `review-animations` | It can only be started by Uzo | **Needs Uzo** (`/review-animations`) | — |
| `animation-performance` | Not installed. The frame-budget test covers what the brief asks of it (below) | Covered by the perf test | — |
| Timing and origin, slowed down | Chrome DevTools Protocol at 0.25× speed, frames captured: cards scale from their top-left, the corner beside the marker's line. `motion.spec.ts` reads the running animations: card in 160ms on `cubic-bezier(0.23, 1, 0.32, 1)`, out 110ms; trace tint 180ms; trace bar 200ms. The sheet runs `sheet-in` for 0.3s on `cubic-bezier(0.32, 0.72, 0, 1)` and, sampled each frame, settles by 298ms | Pass | — |
| No `transition: all`, nothing from `scale(0)`, nothing on keyboard-repeated actions | `motion.spec.ts`: no element transitions `all`; the built CSS has no `scale(0)`; trace steps from the keyboard jump within two frames and the current highlight has no transition | Pass | — |
| Reduced motion makes everything instant | `motion.spec.ts` with `reducedMotion: 'reduce'`: no running animations with any duration, and the sheet is in place on the next frame | Pass | — |
| No frame drops while scrolling and tracing | `npm run test:perf` (Chrome, on its own): wheel-scrolls the report and steps a trace. Under 1% of frames over two 60Hz frames, no long tasks | Pass | — |
| Sheet drag on real touch | Mouse-driven drags pass in three browsers (follow 1:1, flick closes, short drag springs back) | **Needs Uzo** on an iPhone for feel | The drag was rewritten after Motion's missed a grab mid-slide and didn't dismiss in Firefox |

## Accessibility

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| axe reports zero violations on every state | `a11y.spec.ts` and `flows.spec.ts`, light and dark: page, card (rail, popover, sheet), trace, provenance on, every chart as a table, questions panel and composer, Contents menu | Pass, 3 browsers | The Contents popover has a name; cluster markers' names start with their visible count |
| Full keyboard run: no traps, visible focus, logical order | `a11y.spec.ts` tabs through every control on the page in Chrome and Firefox: each is reached once, in document order, with a focus ring. Cards keep focus while open and return it to the marker | Pass. Safari tabs only to form fields by default, so WebKit is skipped | — |
| VoiceOver on macOS and iOS | Names and roles checked in the accessibility tree (marker names, card titles, live region text, chart summaries) | **Needs Uzo** to listen | — |
| Contrast is AA in both themes | axe's contrast rule on every state; token pairs computed (ink 15.5:1 light, 14.9:1 dark; muted text 6.8:1 and 7.7:1; accent 6.9:1 and 9.5:1; chart marks at least 3.3:1) | Pass | Chart gray darkened from 2.86:1 to 3.3:1 |
| Targets are at least 24×24px | `layout.spec.ts` measures every control; markers are checked by hit-testing 11.5px from their center in four directions | Pass | "Read them in full" link given a 24px target |

## Performance and build

| Check | How it was tested | Result | Fix made |
|---|---|---|---|
| Lighthouse mobile ≥95 for Performance, Accessibility, Best Practices | Lighthouse 12.8 (simulated slow 4G, 4× CPU), three runs against the export served gzipped like GitHub Pages, then eight runs against the live URL | Local: **95 / 100 / 100** on all three runs (LCP 2.9s, FCP 1.4s, TBT 20ms, CLS 0, 330 KB). Live: Performance **99** median (93, 94, then 99 six times; the two low runs came first, right after the deploy), Accessibility and Best Practices 100 on every run, CLS 0 | From 57: gzip in the preview server, a subset Source Serif (38 KB, italic 15 KB not preloaded), system UI face, `motion` removed, claim ids instead of claim text sent to the client, the Sources index rendered after hydration |
| No layout shift when opening cards | `motion.spec.ts` sums Layout Instability entries while opening cards in the rail, the questions panel and a trace (Chromium only) | Pass: 0.0 | — |
| `lint`, `tsc`, `test` and `build` are clean | Run before each commit | Pass | — |
| Works under `/lunon-living-report/` locally | The whole browser suite runs against `scripts/serve-export.ts`, which serves only that prefix | Pass | — |
| Works on the live domain | The portfolio's deploy now builds this repo into `/lunon-living-report/` (run 40361550569 succeeded, which is also the first Node 22 build). All 182 browser tests pass against https://uzookafor.com/lunon-living-report/ in three browsers; the page is served gzipped; the portfolio home still serves; the Lab page doesn't list it | Pass | Before deploying, Source Serif's loading stand-in was changed from metric-matched Arial to Times New Roman |

## Automation

| Check | How it was tested | Result |
|---|---|---|
| A committed Playwright suite that walks the main flows, screenshots each viewport in both themes, and runs axe | `tests/` (six files), `playwright.config.ts`, `npm run test:e2e` and `npm run test:perf` | Committed; 182 tests pass in three browsers |

## Needs Uzo

1. VoiceOver on macOS and on iOS: markers, cards, the trace bar and announcements spoken aloud.
2. A real iPhone (Safari) and an Android phone (Chrome): layout, the sheet's drag and the header's blur.
3. `/review-animations`, which only you can start.
