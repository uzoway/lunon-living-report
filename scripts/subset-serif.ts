/**
 * Rebuilds the two Source Serif 4 files in app/fonts, cut down to the
 * characters report 51 and the page's printable ASCII use: the upright font
 * with its full weight range, and the italic at 400, the only weight the
 * report's emphasis uses. Google Fonts does the subsetting through its
 * `text` parameter.
 *
 * Run from the repo root: `node scripts/subset-serif.ts`. Japanese is left
 * out on purpose; it falls back to the system's Mincho.
 */
import {readFile, writeFile} from 'node:fs/promises';

const REPORT = 'content/report-51.md';
const FONTS = [
  {axes: 'wght@200..900', file: 'app/fonts/source-serif-4-report.woff2'},
  {
    axes: 'ital,wght@1,400',
    file: 'app/fonts/source-serif-4-report-italic.woff2',
  },
];
// Google serves woff2 only to browsers it recognizes.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const report = await readFile(REPORT, 'utf8');
const ascii = Array.from({length: 0x7e - 0x21 + 1}, (_, i) =>
  String.fromCharCode(0x21 + i)
);
const used = [...report].filter(c => !/[\s\p{Script=Han}　-ヿ＀-￯]/u.test(c));
const text = [...new Set([...ascii, ...used])].sort().join('');

for (const {axes, file} of FONTS) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Source+Serif+4:${axes}` +
      `&text=${encodeURIComponent(text)}`,
    {headers: {'user-agent': USER_AGENT}}
  ).then(response => response.text());
  const url = /url\((https:[^)]+)\) format\('woff2'\)/.exec(css)?.[1];
  if (!url) throw new Error(`No woff2 in Google's response:\n${css}`);
  const font = await fetch(url).then(response => response.arrayBuffer());
  await writeFile(file, Buffer.from(font));
  console.log(`${file}: ${text.length} characters, ${font.byteLength} bytes`);
}
