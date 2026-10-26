import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/** The verbatim report text (see content/NOTICE). Read at build time only. */
export function readReportMarkdown(): string {
  return readFileSync(join(process.cwd(), 'content', 'report-51.md'), 'utf8');
}
