import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';

import {expect, test, type Page} from '@playwright/test';

import {load, markerFor} from './helpers.ts';

test.use({viewport: {width: 1440, height: 900}});

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Name and duration of every running animation on `selector`. */
function animationsOn(page: Page, selector: string) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    return (el?.getAnimations({subtree: true}) ?? []).map(a => {
      const timing = a.effect?.getComputedTiming();
      return {
        name:
          a instanceof CSSAnimation
            ? a.animationName
            : String(
                a instanceof CSSTransition ? a.transitionProperty : 'script'
              ),
        duration: timing?.duration,
      };
    });
  }, selector);
}

test('a card scales in from its marker in 160ms and leaves faster', async ({
  page,
}) => {
  await load(page);
  const marker = await markerFor(page, 's1');
  await marker.click();
  const opening = await animationsOn(page, '.card');
  expect(opening).toContainEqual({name: 'card-in', duration: 160});
  // A CSS animation's curve is the element's timing function.
  await expect(page.locator('.card')).toHaveCSS(
    'animation-timing-function',
    EASE_OUT
  );
  // Origin at the trigger's side, not the card's center.
  const origin = await page
    .locator('.card')
    .evaluate(el => getComputedStyle(el).transformOrigin);
  expect(origin.startsWith('0px')).toBe(true);
  await page.keyboard.press('Escape');
  const closing = await animationsOn(page, '.card');
  expect(closing).toContainEqual({name: 'card-out', duration: 110});
});

test('a trace fades its tint in over 180ms; the bar arrives in 200ms', async ({
  page,
}) => {
  await load(page);
  await (await markerFor(page, 's1')).click();
  await page.locator('.card [data-trace="s1"]').click();
  const bar = await animationsOn(page, '.trace-bar');
  expect(bar.map(a => a.duration)).toEqual([200, 200]);
  // Every traced claim but the current one fades its tint over 180ms.
  const current = new URL(page.url()).searchParams.get('claim');
  const tinted = page.locator(
    `#report [data-cites~="s1"]:not([data-claim="${current}"])`
  );
  await expect(tinted.first()).toHaveCSS(
    'transition-property',
    'background-color'
  );
  await expect(tinted.first()).toHaveCSS('transition-duration', '0.18s');
});

test('stepping a trace from the keyboard jumps without animating', async ({
  page,
}) => {
  await load(page);
  await (await markerFor(page, 's1')).click();
  await page.locator('.card [data-trace="s1"]').click();
  const next = page.getByRole('button', {name: 'Next claim'});
  await expect(next).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Enter');
    // The scroll lands within two frames; a smooth scroll would still be moving.
    const settled = await page.evaluate(async () => {
      const frame = () => new Promise(requestAnimationFrame);
      await frame();
      await frame();
      const y = window.scrollY;
      await new Promise(resolve => setTimeout(resolve, 250));
      return window.scrollY === y;
    });
    expect(settled).toBe(true);
    // The current claim's highlight changes without a transition.
    const claim = new URL(page.url()).searchParams.get('claim');
    const transition = await page
      .locator(`#report [data-claim="${claim}"]`)
      .evaluate(el => getComputedStyle(el).transitionProperty);
    expect(transition).toBe('none');
  }
});

test('reduced motion makes everything instant', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await load(page);
  await (await markerFor(page, 's1')).click();
  const card = await animationsOn(page, '.card');
  expect(card.every(a => a.duration === 0)).toBe(true);
  await page.locator('.card [data-trace="s1"]').click();
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(a => (a.effect?.getComputedTiming().duration ?? 0) !== 0).length
  );
  expect(running).toBe(0);

  await page.setViewportSize({width: 375, height: 812});
  await page.getByRole('button', {name: 'Close trace'}).click();
  await (await markerFor(page, 's2')).click();
  // The sheet is in place on the next frame.
  const sheetTop = await page.locator('.sheet').evaluate(async el => {
    await new Promise(requestAnimationFrame);
    return el.getBoundingClientRect().bottom;
  });
  expect(sheetTop).toBeLessThanOrEqual(812);
});

test('no element transitions "all", and nothing scales from zero', async ({
  page,
}) => {
  await load(page);
  const all = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter(el => {
        const style = getComputedStyle(el);
        return (
          style.transitionProperty.split(', ').includes('all') &&
          style.transitionDuration.split(', ').some(d => d !== '0s')
        );
      })
      .map(el => el.className)
  );
  expect(all).toEqual([]);

  const dir = join(process.cwd(), 'out', '_next', 'static', 'chunks');
  const css = (await readdir(dir)).filter(f => f.endsWith('.css'));
  for (const file of css) {
    const text = await readFile(join(dir, file), 'utf8');
    expect(text).not.toMatch(/scale\(0\)|scale:\s*0[;}]/);
  }
});

test('opening cards and panels never shifts the layout', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Layout Instability API is Chromium only'
  );
  await load(page);
  await page.evaluate(() => {
    const shifts: number[] = [];
    Object.assign(window, {shifts});
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        shifts.push((entry as unknown as {value: number}).value);
      }
    }).observe({type: 'layout-shift'});
  });
  for (const id of ['s1', 's4', 's30']) {
    await (await markerFor(page, id)).click();
    await expect(page.locator('.card')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', {name: /^Questions/}).click();
  await page.keyboard.press('Escape');
  await (await markerFor(page, 's1')).click();
  await page.locator('.card [data-trace="s1"]').click();
  await page.getByRole('button', {name: 'Next claim'}).click();
  await page.waitForTimeout(600);
  const total = await page.evaluate(() =>
    (window as unknown as {shifts: number[]}).shifts.reduce((a, b) => a + b, 0)
  );
  expect(total).toBe(0);
});

test('scrolling and tracing keep to the frame budget @perf', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Long Tasks API is Chromium only');
  await load(page);
  // Count frames and long tasks while the page is scrolled and traced.
  await page.evaluate(() => {
    const stats = {gaps: [] as number[], long: [] as number[], running: true};
    Object.assign(window, {stats});
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) stats.long.push(entry.duration);
    }).observe({type: 'longtask'});
    let last = performance.now();
    const tick = (now: number) => {
      stats.gaps.push(now - last);
      last = now;
      if (stats.running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(700, 450);
  for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 400);
  await (await markerFor(page, 's1')).click();
  await page.locator('.card [data-trace="s1"]').click();
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', {name: 'Next claim'}).click();
    await page.waitForTimeout(350);
  }
  const {gaps, long} = await page.evaluate(() => {
    const {stats} = window as unknown as {
      stats: {gaps: number[]; long: number[]; running: boolean};
    };
    stats.running = false;
    return stats;
  });
  // A frame is dropped when one takes more than two 60Hz frames.
  const dropped = gaps.slice(1).filter(gap => gap > 34).length;
  expect(dropped / gaps.length).toBeLessThan(0.01);
  expect(long).toEqual([]);
});
