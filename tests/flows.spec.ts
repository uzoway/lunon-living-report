import {readFile} from 'node:fs/promises';

import {expect, test} from '@playwright/test';
import type {Root} from 'mdast';
import remarkParse from 'remark-parse';
import {unified} from 'unified';

import {
  expectNoAxeViolations,
  load,
  markerFor,
  report,
  searchParam,
  sources,
} from './helpers.ts';

// The main flows, on desktop: open a source, trace, pin a question, toggle
// provenance and switch the theme. Phone versions are at the end.

test.describe('desktop', () => {
  test.use({viewport: {width: 1440, height: 900}});

  test('every asset loads under the prefix, with no errors', async ({page}) => {
    const failed: string[] = [];
    const errors: string[] = [];
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('response', response => {
      if (response.status() >= 400)
        failed.push(`${response.status()} ${response.url()}`);
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const urls: string[] = [];
    page.on('request', request => urls.push(new URL(request.url()).pathname));
    await load(page);
    // Use the page a little, so lazily loaded fonts and chunks are fetched.
    await (await markerFor(page, 's1')).click();
    await page.keyboard.press('Escape');
    await page.locator('#s-10-1').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
    expect(urls.every(path => path.startsWith('/lunon-living-report/'))).toBe(
      true
    );
  });

  test('a source card opens beside the text and returns focus', async ({
    page,
  }) => {
    await load(page);
    const marker = await markerFor(page, 's1');
    const textBefore = await marker.evaluate(el =>
      el.closest('p')?.getBoundingClientRect().toJSON()
    );
    await marker.click();
    const card = page.locator('.card[data-mode="rail"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading')).toHaveText('[1] ipss.go.jp');
    await expect(card.getByRole('link', {name: /Open source/})).toHaveAttribute(
      'href',
      sources.get('s1')?.url ?? ''
    );
    await expect(marker).toHaveAttribute('aria-expanded', 'true');
    // Nothing in the reading column moved, and the card sits in the rail.
    const textAfter = await marker.evaluate(el =>
      el.closest('p')?.getBoundingClientRect().toJSON()
    );
    expect(textAfter).toEqual(textBefore);
    const [cardBox, column] = await Promise.all([
      card.boundingBox(),
      page.locator('#report').boundingBox(),
    ]);
    expect(cardBox?.x).toBeGreaterThanOrEqual(
      (column?.x ?? 0) + (column?.width ?? 0)
    );
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(marker).toBeFocused();
    await expect(marker).toHaveAttribute('aria-expanded', 'false');
  });

  test('a trace steps through every claim, survives a reload and clears', async ({
    page,
  }) => {
    // 29 claims, each scrolled to smoothly.
    test.setTimeout(120_000);
    await load(page);
    await (await markerFor(page, 's1')).click();
    await page.locator('.card [data-trace="s1"]').click();
    const status = page.locator('.trace-status');
    await expect(status).toContainText('of 29');
    expect(searchParam(page, 'trace')).toBe('s1');

    // Every claim citing IPSS, tables included, in reading order.
    const expected = report.claims
      .filter(c => c.sourceIds.includes('s1'))
      .map(c => c.id);
    // The trace starts at the marker's claim; walk back to the first.
    while (searchParam(page, 'claim') !== expected[0]) {
      const claim = searchParam(page, 'claim');
      await page.getByRole('button', {name: 'Previous claim'}).click();
      await expect.poll(() => searchParam(page, 'claim')).not.toBe(claim);
    }
    const visited: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      const claim = searchParam(page, 'claim') ?? '';
      visited.push(claim);
      await expect(status).toContainText(`Claim ${i + 1} of 29`);
      await expect(
        page.locator(`#report [data-claim="${claim}"]`)
      ).toBeInViewport();
      if (i < expected.length - 1) {
        await page.getByRole('button', {name: 'Next claim'}).click();
        await expect.poll(() => searchParam(page, 'claim')).not.toBe(claim);
      }
    }
    expect(visited).toEqual(expected);
    await expect(page.getByRole('button', {name: 'Next claim'})).toBeDisabled();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(status).toContainText('Claim 29 of 29');
    await expectNoAxeViolations(page);

    await page.keyboard.press('Escape');
    await expect(status).toBeHidden();
    expect(searchParam(page, 'trace')).toBeNull();

    // The close button clears it too.
    await page.goto('?trace=s4&claim=c999');
    await expect(status).toContainText('Claim 1 of');
    await page.getByRole('button', {name: 'Close trace'}).click();
    await expect(status).toBeHidden();
    expect(searchParam(page, 'trace')).toBeNull();
  });

  test('provenance labels match the parser, claim by claim', async ({page}) => {
    await load(page);
    const toggle = page.getByRole('button', {name: 'Provenance'});
    await expect(page.locator('#report .provenance').first()).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const labels = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('#report [data-claim]')].map(el => [
          el.getAttribute('data-claim'),
          el.querySelector('.provenance')?.getAttribute('data-kind') ?? null,
        ])
      )
    );
    for (const claim of report.claims) {
      expect(labels[claim.id], claim.id).toBe(claim.provenance ?? null);
    }
    await expect(page.locator('.provenance-legend')).toBeVisible();
    await expectNoAxeViolations(page);
    await toggle.click();
    await expect(page.locator('#report .provenance').first()).toBeHidden();
  });

  test('a question can be pinned, edited, deleted, restored and exported', async ({
    page,
    browserName,
  }) => {
    await load(page);
    const sentence = page.locator('#s-5-1 ~ p [data-claim]').first();
    const claimId = await sentence.getAttribute('data-claim');
    await sentence.scrollIntoViewIfNeeded();
    const box = await sentence.boundingBox();
    await page.mouse.click((box?.x ?? 0) + 40, (box?.y ?? 0) + 8);
    await page.getByRole('button', {name: 'Ask about this'}).click();
    const field = page.getByLabel('Your question');
    await expect(field).toBeFocused();
    await expect(page.getByLabel('About')).toHaveValue(claimId ?? '');
    await field.fill('What per-capita outlay does the model assume?');
    await page.getByRole('button', {name: 'Save question'}).click();
    await expect(page.locator('.question')).toHaveCount(1);
    await expect(page.locator('.header-button .count')).toHaveText('1');
    await expectNoAxeViolations(page);

    await page.getByRole('button', {name: 'Edit question 1'}).click();
    await page.keyboard.type(' Per household?');
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(page.locator('.question-text')).toHaveText(
      'What per-capita outlay does the model assume? Per household?'
    );

    // Export: the download is valid Markdown with the quote and question.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', {name: 'Download .md'}).click(),
    ]);
    const exported = await readFile((await download.path()) ?? '', 'utf8');
    const tree: Root = unified().use(remarkParse).parse(exported);
    expect(tree.children.map(n => n.type)).toEqual([
      'heading',
      'paragraph',
      'heading',
      'blockquote',
      'paragraph',
    ]);
    expect(exported).toContain('Per household?');
    if (browserName === 'chromium') {
      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', {name: 'Copy as Markdown'}).click();
      await expect(page.getByRole('button', {name: 'Copied'})).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        exported
      );
    }

    // It survives a reload and marks the claim.
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.header-button .count')).toHaveText('1');
    await expect(page.locator(`#report [data-claim="${claimId}"]`)).toHaveCSS(
      'text-decoration-style',
      'dotted'
    );

    await page.getByRole('button', {name: /^Questions/}).click();
    await page.getByRole('button', {name: 'Delete question 1'}).click();
    await expect(page.locator('.question')).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo'}).click();
    await expect(page.locator('.question')).toHaveCount(1);

    // Any claim can be picked from the panel, which is the keyboard route.
    await page.getByRole('button', {name: 'New question'}).click();
    await expect(
      page.getByRole('button', {name: 'Save question'})
    ).toBeDisabled();
    await page.getByLabel('About').selectOption(report.claims.at(-1)?.id ?? '');
    await page.getByLabel('Your question').fill('Which comes first?');
    await page.getByRole('button', {name: 'Save question'}).click();
    await expect(page.locator('.question')).toHaveCount(2);
  });

  test('questions still work when storage is blocked', async ({page}) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Blocked', 'SecurityError');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await load(page);
    await page.getByRole('button', {name: /^Questions/}).click();
    await expect(
      page.getByText('This browser is blocking storage')
    ).toBeVisible();
    await page.getByRole('button', {name: 'New question'}).click();
    await page.getByLabel('Your question').fill('Does this still work?');
    await page.getByRole('button', {name: 'Save question'}).click();
    await expect(page.locator('.question')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('the theme switches and is remembered', async ({page}) => {
    await load(page);
    const paper = () =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor
      );
    const light = await paper();
    await page.getByRole('button', {name: 'Switch to dark theme'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await paper()).not.toBe(light);
    // The browser chrome follows the page.
    await expect(
      page.locator('meta[name="theme-color"]').first()
    ).toHaveAttribute('content', await paper());
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.getByRole('button', {name: 'Switch to light theme'})
    ).toBeVisible();
  });
});

test.describe('phone', () => {
  test.use({viewport: {width: 375, height: 812}, hasTouch: true});

  test('cards and questions open as sheets', async ({page}) => {
    await load(page);
    await (await markerFor(page, 's2')).tap();
    const sheet = page.locator('.sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading')).toHaveText('[2] stat.go.jp');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();

    await page.getByRole('button', {name: /^Questions/}).tap();
    await expect(sheet.getByRole('heading', {name: 'Questions'})).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('dragging a sheet down closes it', async ({page}) => {
    await load(page);
    await (await markerFor(page, 's2')).click();
    const sheet = page.locator('.sheet');
    // Grab it once it has settled at the bottom of the screen.
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox();
        return Math.round((box?.y ?? 0) + (box?.height ?? 0));
      })
      .toBe(812);
    const grip = await page.locator('.sheet-grip').boundingBox();
    const x = (grip?.x ?? 0) + 40;
    const y = (grip?.y ?? 0) + 10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 200, {steps: 8});
    // It follows the pointer one to one.
    expect((await sheet.boundingBox())?.y).toBeCloseTo(
      (grip?.y ?? 0) + 200,
      -1
    );
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });

  test('a short drag springs back', async ({page}) => {
    await load(page);
    await (await markerFor(page, 's2')).click();
    const sheet = page.locator('.sheet');
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox();
        return Math.round((box?.y ?? 0) + (box?.height ?? 0));
      })
      .toBe(812);
    const settled = (await sheet.boundingBox())?.y ?? 0;
    const grip = await page.locator('.sheet-grip').boundingBox();
    const x = (grip?.x ?? 0) + 40;
    const y = (grip?.y ?? 0) + 10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 60, {steps: 20});
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect(sheet).toBeVisible();
    await expect
      .poll(async () => Math.round((await sheet.boundingBox())?.y ?? 0))
      .toBe(Math.round(settled));
  });

  test('a quick flick closes it from a short drag', async ({page}) => {
    await load(page);
    await (await markerFor(page, 's2')).click();
    const sheet = page.locator('.sheet');
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox();
        return Math.round((box?.y ?? 0) + (box?.height ?? 0));
      })
      .toBe(812);
    const grip = await page.locator('.sheet-grip').boundingBox();
    const x = (grip?.x ?? 0) + 40;
    const y = (grip?.y ?? 0) + 10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 60, {steps: 3});
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });

  test('a traced link opens with its bar on screen', async ({page}) => {
    const claim = report.claims.filter(c => c.sourceIds.includes('s1'))[4];
    await load(page, `?trace=s1&claim=${claim?.id}`);
    await expect(page.locator('.trace-status')).toContainText('Claim 5 of 29');
    await expect(page.locator('.trace-bar')).toBeInViewport({ratio: 1});
    await expect(
      page.locator(`#report [data-claim="${claim?.id}"]`)
    ).toBeInViewport();
  });
});
