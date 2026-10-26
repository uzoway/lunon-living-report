import {expect, test} from '@playwright/test';

import {countEvidence} from '../lib/report/provenance.ts';
import {shortName} from '../lib/report/sources.ts';

import {load, markdown, report, sources} from './helpers.ts';

test.use({viewport: {width: 1440, height: 900}});

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

test('the rendered report is the source text, word for word', async ({
  page,
}) => {
  await load(page);
  // From the page: the title and the report, without what this page adds
  // (markers, labels, chart drawings, toggles) or the timeline (checked below).
  const rendered = await page.evaluate(() => {
    const clone = document.querySelector('#report')?.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return '';
    clone
      .querySelectorAll('.marker, .provenance, .chart, .view-toggle, .timeline')
      .forEach(el => el.remove());
    // Blocks and cells end words; textContent alone would run them together.
    clone
      .querySelectorAll('h2, h3, p, li, th, td')
      .forEach(el => el.append(' '));
    return `${document.querySelector('h1')?.textContent} ${clone.textContent}`;
  });
  // From the markdown, with regular expressions only.
  const source = markdown
    .replace(/```mermaid[\s\S]*?```/, '')
    .replace(/\[[^\]]*\]\(https?:\/\/[^)\s]+\)/g, '')
    .split('\n')
    .filter(line => !/^\|?(?:\s*:?-{3,}:?\s*\|?)+$/.test(line))
    .map(line => line.replace(/^(?:#+|\d+\.|[-*])\s/, ''))
    .join('\n')
    .replaceAll('**', '')
    .replaceAll('*', '')
    .replaceAll('|', ' ');
  expect(words(rendered)).toEqual(words(source));
});

test('the timeline shows every period and event', async ({page}) => {
  await load(page);
  const shown = await page
    .locator('#report .timeline li')
    .evaluateAll(items =>
      items
        .filter(li => li.querySelector('.timeline-period'))
        .map(li => li.textContent)
    );
  const lines = markdown.match(/^ (\d{4}) : (.+)$/gm) ?? [];
  expect(shown).toEqual(lines.map(line => line.trim().replaceAll(' : ', '')));
});

test("the Brief's evidence line is the parser's totals", async ({page}) => {
  await load(page);
  const {cited, modeled, unattributed} = countEvidence(report.claims);
  await expect(page.locator('.evidence')).toHaveText(
    `${report.sources.length} sources · ${cited} cited figures · ` +
      `${modeled} modeled · ${unattributed} not attributed`
  );
});

test('every marker opens its own sources, with their exact URLs', async ({
  page,
}) => {
  await load(page);
  // The markers follow the report's citation runs, in order.
  const markers = page.locator('#report button[data-sources]');
  const expectedRuns = report.sections.flatMap(section =>
    section.blocks.flatMap(block => {
      const runs =
        block.kind === 'paragraph'
          ? block.sentences.flatMap(s => s.runs)
          : block.kind === 'list'
            ? block.items.flat().flatMap(s => s.runs)
            : block.kind === 'table'
              ? [
                  ...block.table.header.flat(),
                  ...block.table.rows.flatMap(r => r.cells.flat()),
                ]
              : [];
      return runs.flatMap(run =>
        run.kind === 'citation' ? [[...new Set(run.sourceIds)].join(' ')] : []
      );
    })
  );
  const shownRuns = await markers.evaluateAll(els =>
    els.map(el => el.getAttribute('data-sources'))
  );
  expect(shownRuns).toEqual(expectedRuns);

  // Charted tables hide their markers until the Table view is chosen.
  for (const button of await page.getByRole('button', {name: 'Table'}).all()) {
    await button.click();
  }
  const card = page.locator('.card[data-mode="rail"]');
  for (let i = 0; i < shownRuns.length; i++) {
    const ids = (shownRuns[i] ?? '').split(' ');
    await markers.nth(i).click();
    const title =
      ids.length === 1
        ? shortName(sources.get(ids[0] ?? '') ?? {number: 0, domain: ''})
        : `${ids.length} sources`;
    await expect(card.getByRole('heading'), `marker ${i}`).toHaveText(title);
    const hrefs = await card
      .locator('.source-open')
      .evaluateAll(links => links.map(a => a.getAttribute('href')));
    expect(hrefs, `marker ${i}`).toEqual(ids.map(id => sources.get(id)?.url));
  }
});

test('every marker is named by its sources', async ({page}) => {
  await load(page);
  const labels = await page
    .locator('button[data-sources]')
    .evaluateAll(els =>
      els.map(el => [
        el.getAttribute('data-sources'),
        el.getAttribute('aria-label'),
      ])
    );
  for (const [ids, label] of labels) {
    const cited = (ids ?? '').split(' ').map(id => sources.get(id));
    const first = cited[0] && shortName(cited[0]);
    expect(label).toBe(
      cited.length === 1
        ? `Source: ${first}`
        : `${cited.length} sources: ${first} and ${cited.length - 1} more`
    );
  }
});

test('the outline marks each section as it is read', async ({page}) => {
  await load(page);
  const sections = report.sections.filter(s => s.depth === 2);
  for (const section of sections) {
    await page.evaluate(id => {
      const heading = document.getElementById(id);
      window.scrollTo(0, (heading?.offsetTop ?? 0) - 80);
    }, section.id);
    await expect(page.locator('.toc [aria-current]')).toHaveText(section.title);
  }
});

test('every section can be linked to directly', async ({page}) => {
  await load(page);
  const header = await page.locator('.site-header').boundingBox();
  for (const section of report.sections) {
    await page.evaluate(id => {
      window.location.hash = id;
    }, section.id);
    const top = await page
      .locator(`#${section.id}`)
      .evaluate(el => el.getBoundingClientRect().top);
    // Just below the sticky header, unless the page ran out of scroll.
    const atBottom = await page.evaluate(
      () =>
        window.scrollY + window.innerHeight >= document.body.scrollHeight - 2
    );
    if (!atBottom) {
      expect(top, section.id).toBeGreaterThanOrEqual(header?.height ?? 0);
      expect(top, section.id).toBeLessThan((header?.height ?? 0) + 40);
    }
  }
});

test('Japanese runs are marked lang="ja"', async ({page}) => {
  await load(page);
  const unmarked = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.querySelector('main') ?? document.body,
      NodeFilter.SHOW_TEXT
    );
    const missed: string[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      if (/[\p{Script=Han}぀-ヿ]/u.test(text)) {
        if (!node.parentElement?.closest('[lang="ja"]')) missed.push(text);
      }
    }
    return missed;
  });
  expect(unmarked).toEqual([]);
});
