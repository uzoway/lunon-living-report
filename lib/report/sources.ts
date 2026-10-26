/**
 * The report was written in 2026, so a later year in a label is a forecast
 * horizon ("Market Outlook 2033"), not when the source was published.
 */
const LATEST_YEAR = 2026;

/** A four-digit year that isn't part of a longer number or a range. */
const YEAR = /(?<![\d\-‐‑–～~])(?:19|20)\d{2}(?![\d\-‐‑–～~])/g;

/**
 * Two links are the same source when they match after lowercasing the host
 * and dropping the fragment. Everything else is kept exactly.
 */
export function normalizeUrl(url: string): string {
  const withoutFragment = url.split('#', 1)[0] ?? url;
  return withoutFragment.replace(
    /^(https?:\/\/)([^/?]+)/i,
    (_match, scheme: string, host: string) => scheme + host.toLowerCase()
  );
}

/** The host without a leading `www.` (or `www8.`), for grouping and naming. */
export function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\d*\./, '');
}

/**
 * The first publication year that can be read from a label, or undefined.
 * Ranges such as 1995～2050 are skipped rather than guessed at.
 */
export function yearOf(label: string): number | undefined {
  for (const match of label.matchAll(YEAR)) {
    const year = Number(match[0]);
    if (year <= LATEST_YEAR) return year;
  }
  return undefined;
}
