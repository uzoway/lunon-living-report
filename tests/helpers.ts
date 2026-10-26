import AxeBuilder from '@axe-core/playwright';
import {expect, type Locator, type Page} from '@playwright/test';

import {readReportMarkdown} from '../lib/report/content.ts';
import {parseReport} from '../lib/report/parse.ts';

export const markdown = readReportMarkdown();
export const report = parseReport(markdown);
export const sources = new Map(report.sources.map(s => [s.id, s]));

export const VIEWPORTS = [320, 375, 768, 1024, 1280, 1440] as const;
export const THEMES = ['light', 'dark'] as const;

/** Loads the page and waits until it has hydrated and is interactive. */
export async function load(page: Page, path = '') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function expectNoAxeViolations(page: Page) {
  const {violations} = await new AxeBuilder({page}).analyze();
  expect(
    violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)
  ).toEqual([]);
}

/** A marker for `sourceId` in the report body, scrolled into view. */
export async function markerFor(
  page: Page,
  sourceId: string
): Promise<Locator> {
  const marker = page
    .locator(`#report button[data-sources~="${sourceId}"]`)
    .first();
  await marker.scrollIntoViewIfNeeded();
  return marker;
}

export function searchParam(page: Page, name: string): string | null {
  return new URL(page.url()).searchParams.get(name);
}

/** The page never scrolls sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
