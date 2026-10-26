import {expect, test, type Page} from '@playwright/test';

import {expectNoHorizontalScroll, load, markerFor, sources} from './helpers.ts';

// Worst cases the real report doesn't have, built from it: a ten-source
// cluster, labels far longer than any real one, and extreme questions.

const sizes = [
  {name: 'desktop', width: 1440, height: 900},
  {name: 'phone', width: 375, height: 812},
];

/** The open card, wherever this width shows it. */
const card = (page: Page) => page.locator('.card, .sheet').first();

/** Nothing visible sticks out past the card's right edge. */
async function expectFits(page: Page) {
  // Measured once the sheet has finished sliding in.
  const viewport = page.viewportSize();
  await expect
    .poll(async () => {
      const box = await card(page).boundingBox();
      return (box?.y ?? 0) + (box?.height ?? 0);
    })
    .toBeLessThanOrEqual(viewport?.height ?? 0);
  const overflow = await card(page).evaluate(el =>
    [...el.querySelectorAll('*')].some(
      child =>
        child.getBoundingClientRect().right >
        el.getBoundingClientRect().right + 1
    )
  );
  expect(overflow).toBe(false);
  await expectNoHorizontalScroll(page);
}

for (const size of sizes) {
  test.describe(size.name, () => {
    test.use({viewport: {width: size.width, height: size.height}});

    test('a ten-source cluster lists every source and scrolls', async ({
      page,
    }) => {
      await load(page);
      const ids = Array.from({length: 10}, (_, i) => `s${i + 1}`);
      const marker = await markerFor(page, 's1');
      await marker.evaluate((el, value) => {
        el.setAttribute('data-sources', value);
      }, ids.join(' '));
      await marker.click();
      await expect(card(page).locator('.source')).toHaveCount(10);
      await expect(card(page).getByRole('heading').first()).toHaveText(
        '10 sources'
      );
      await expectFits(page);
      const scrolls = await card(page).evaluate(el => {
        const body = el.matches('.sheet')
          ? el.querySelector('.sheet-body')
          : el;
        return (body?.scrollHeight ?? 0) > (body?.clientHeight ?? 0);
      });
      expect(scrolls).toBe(true);
    });

    test('very long and unbroken labels wrap inside the card', async ({
      page,
    }) => {
      await load(page);
      await (await markerFor(page, 's3')).click();
      await card(page)
        .locator('.source-label')
        .evaluate(el => {
          el.textContent = `${'A very long source title that keeps going '.repeat(12)}${'x'.repeat(160)}`;
        });
      await expectFits(page);
    });

    test('a label cut off mid-word is shown as written, with no year', async ({
      page,
    }) => {
      await load(page);
      await (await markerFor(page, 's3')).click();
      await expect(card(page).locator('.source-label')).toHaveText(
        sources.get('s3')?.label ?? ''
      );
      await expect(card(page).locator('.source-meta')).toHaveText(
        `Cited ${sources.get('s3')?.citationCount} times in this report`
      );
    });

    test('empty questions cannot be saved; very long ones wrap', async ({
      page,
    }) => {
      await load(page);
      await page.getByRole('button', {name: /^Questions/}).click();
      await page.getByRole('button', {name: 'New question'}).click();
      const save = page.getByRole('button', {name: 'Save question'});
      await expect(save).toBeDisabled();
      await page.getByLabel('Your question').fill('   \n  ');
      await expect(save).toBeDisabled();
      const long = `${'Why does the care line rise so steeply after 2035? '.repeat(40)}${'y'.repeat(300)}`;
      await page.getByLabel('Your question').fill(long);
      await save.click();
      await expect(page.locator('.question-text')).toHaveText(long.trim());
      const panel = page.locator('.questions-card, .sheet').first();
      const overflow = await panel.evaluate(el =>
        [...el.querySelectorAll('*')].some(
          child =>
            child.getBoundingClientRect().right >
            el.getBoundingClientRect().right + 1
        )
      );
      expect(overflow).toBe(false);
      await expectNoHorizontalScroll(page);
    });
  });
}
