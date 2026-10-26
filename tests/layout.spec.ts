import {expect, test} from '@playwright/test';

import {
  expectNoHorizontalScroll,
  load,
  markerFor,
  THEMES,
  VIEWPORTS,
} from './helpers.ts';

// Every viewport in both themes: a screenshot for review, and the layout
// rules that can be measured.
for (const width of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`${width}px ${theme}`, async ({page}, testInfo) => {
      await page.setViewportSize({width, height: 900});
      await page.emulateMedia({colorScheme: theme});
      await load(page);
      await page.screenshot({
        path: testInfo.outputPath(`${width}-${theme}.png`),
      });

      await expectNoHorizontalScroll(page);
      // Still none with every label shown and every chart as a table.
      await page.getByRole('button', {name: 'Provenance'}).click();
      for (const button of await page
        .getByRole('button', {name: 'Table'})
        .all()) {
        await button.click();
      }
      await expectNoHorizontalScroll(page);

      // The header's controls never overlap.
      const boxes = await page
        .locator(
          '.site-header :is(.brand, .contents-trigger, .header-button, .icon-button)'
        )
        .evaluateAll(els =>
          els
            .map(el => el.getBoundingClientRect())
            .filter(r => r.width > 0)
            .map(r => [r.left, r.right])
        );
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i]?.[0]).toBeGreaterThanOrEqual(boxes[i - 1]?.[1] ?? 0);
      }

      if (width <= 375) {
        // Wide tables scroll inside their own box, not the page.
        const scrolling = await page
          .locator('.table-wrap')
          .evaluateAll(
            els => els.filter(el => el.scrollWidth > el.clientWidth).length
          );
        expect(scrolling).toBeGreaterThan(0);
      }
    });
  }
}

test.describe('reading', () => {
  for (const width of [768, 1024, 1280, 1440]) {
    test(`the measure holds at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height: 900});
      await load(page);
      await page.evaluate(() => document.fonts.ready);
      // Characters on each full line of the report's paragraphs.
      const median = await page.evaluate(() => {
        const counts: number[] = [];
        for (const p of document.querySelectorAll('#report > p')) {
          const lines = new Map<number, number>();
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.parentElement?.closest('.marker')) continue;
            for (let i = 0; i < (node.textContent ?? '').length; i++) {
              const range = document.createRange();
              range.setStart(node, i);
              range.setEnd(node, i + 1);
              const rect = range.getClientRects()[0];
              if (!rect) continue;
              const line = Math.round(rect.bottom / 8);
              lines.set(line, (lines.get(line) ?? 0) + 1);
            }
          }
          counts.push(...[...lines.values()].slice(0, -1).filter(n => n > 20));
        }
        counts.sort((a, b) => a - b);
        return counts[Math.floor(counts.length / 2)] ?? 0;
      });
      expect(median).toBeGreaterThanOrEqual(62);
      expect(median).toBeLessThanOrEqual(72);
    });
  }

  for (const width of [1280, 1440]) {
    test(`the margin rail never covers text at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height: 900});
      await load(page);
      const column = await page.locator('#report').boundingBox();
      for (const id of ['s1', 's30', 's61']) {
        await (await markerFor(page, id)).click();
        const card = await page.locator('.card').boundingBox();
        expect(card?.x).toBeGreaterThanOrEqual(
          (column?.x ?? 0) + (column?.width ?? 0)
        );
        expect((card?.x ?? 0) + (card?.width ?? 0)).toBeLessThanOrEqual(width);
      }
    });
  }

  test('targets are at least 24 by 24 pixels', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await load(page);
    const small = await page.evaluate(() => {
      const misses: string[] = [];
      const controls = document.querySelectorAll<HTMLElement>(
        'a[href], button, select, textarea, [tabindex="0"]'
      );
      for (const el of controls) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        // Links inside a sentence are exempt (WCAG 2.5.8, inline).
        if (el.tagName === 'A' && el.closest('p') && !el.className) continue;
        if (el.classList.contains('marker')) {
          // The chip is small; its hit area reaches 12px from the center.
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const reach = [
            [x - 11.5, y],
            [x + 11.5, y],
            [x, y - 11.5],
            [x, y + 11.5],
          ].every(
            ([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0) === el
          );
          if (!reach && r.top > 60 && r.bottom < innerHeight)
            misses.push('marker');
          continue;
        }
        if (r.width < 24 || r.height < 24) {
          misses.push(`${el.tagName}.${el.className} ${r.width}x${r.height}`);
        }
      }
      return misses;
    });
    expect(small).toEqual([]);
  });
});
