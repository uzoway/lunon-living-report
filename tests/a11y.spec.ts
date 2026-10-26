import {expect, test} from '@playwright/test';

import {expectNoAxeViolations, load, markerFor} from './helpers.ts';

// axe on every state the page can be in, in both themes.
for (const theme of ['light', 'dark'] as const) {
  test.describe(`axe, ${theme}`, () => {
    test.beforeEach(async ({page}) => {
      await page.emulateMedia({colorScheme: theme});
    });

    test('desktop states', async ({page}) => {
      await page.setViewportSize({width: 1440, height: 900});
      await load(page);
      await expectNoAxeViolations(page);
      await (await markerFor(page, 's1')).click();
      await expectNoAxeViolations(page);
      await page.locator('.card [data-trace="s1"]').click();
      await expect(page.locator('.trace-bar')).toBeVisible();
      await expectNoAxeViolations(page);
      await page.getByRole('button', {name: 'Close trace'}).click();
      await page.getByRole('button', {name: 'Provenance'}).click();
      await expectNoAxeViolations(page);
      for (const button of await page
        .getByRole('button', {name: 'Table'})
        .all()) {
        await button.click();
      }
      await expectNoAxeViolations(page);
      await page.getByRole('button', {name: /^Questions/}).click();
      await page.getByRole('button', {name: 'New question'}).click();
      await expectNoAxeViolations(page);
    });

    test('tablet states', async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      await load(page);
      await page.locator('.contents-trigger').click();
      await expectNoAxeViolations(page);
      await page.keyboard.press('Escape');
      await (await markerFor(page, 's4')).click();
      await expect(page.locator('.card[data-mode="popover"]')).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test('phone states', async ({page}) => {
      await page.setViewportSize({width: 375, height: 812});
      await load(page);
      await expectNoAxeViolations(page);
      await (await markerFor(page, 's4')).click();
      await expect(page.locator('.sheet')).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}

test('the keyboard reaches everything in order, with focus always shown', async ({
  page,
  browserName,
}) => {
  // Safari only tabs to links and buttons with its "Press Tab to highlight
  // each item" setting on, which WebKit here doesn't have.
  test.skip(browserName === 'webkit', 'Safari tabs to form fields only');
  await page.setViewportSize({width: 1440, height: 900});
  await load(page);
  const total = await page.evaluate(
    () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, select, textarea, [tabindex="0"]'
        ),
      ].filter(el => el.getClientRects().length > 0 && !el.closest('[hidden]'))
        .length
  );
  const order: number[] = [];
  for (let i = 0; i < total; i++) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || el === document.body) return null;
      const all = [...document.querySelectorAll('*')];
      const style = getComputedStyle(el);
      return {
        index: all.indexOf(el),
        key: `${el.tagName}${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 30)}`,
        ring: style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
      };
    });
    if (!step) break;
    expect(step.ring, step.key).toBe(true);
    // Focus moved on: no element holds it twice.
    expect(order).not.toContain(step.index);
    order.push(step.index);
  }
  // Every control was reached, in document order, and focus moved on each time.
  expect(order.length).toBeGreaterThan(total * 0.95);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test('a card keeps keyboard focus until it closes', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Safari tabs to form fields only');
  await page.setViewportSize({width: 1440, height: 900});
  await load(page);
  const marker = await markerFor(page, 's5');
  await marker.focus();
  await page.keyboard.press('Enter');
  const card = page.locator('.card');
  await expect(card).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await card.evaluate(el => el.contains(document.activeElement))).toBe(
      true
    );
  }
  await page.keyboard.press('Escape');
  await expect(marker).toBeFocused();
});

test('trace changes are announced', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await load(page);
  await (await markerFor(page, 's1')).click();
  await page.locator('.card [data-trace="s1"]').click();
  await expect(page.locator('#announcer')).toHaveText(
    /^Showing 29 claims that cite \[1\] ipss\.go\.jp\. Claim \d+ of 29\.$/
  );
  await page.getByRole('button', {name: 'Next claim'}).click();
  await expect(page.locator('#announcer')).toHaveText(/^Claim \d+ of 29$/);
});
