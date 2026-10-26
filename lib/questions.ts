import type {Claim} from './report/types.ts';

/** A reader's question, pinned to one claim. */
export interface Question {
  id: string;
  claimId: string;
  text: string;
  createdAt: string;
}

export interface ExportContext {
  title: string;
  /** In reading order. */
  claims: Array<Pick<Claim, 'id' | 'sectionId' | 'text'>>;
  sectionTitles: ReadonlyMap<string, string>;
}

/**
 * The questions as a Markdown document for the engagement team: one heading
 * per section, each claim quoted, its questions below, in reading order.
 */
export function questionsToMarkdown(
  questions: Question[],
  {title, claims, sectionTitles}: ExportContext
): string {
  const lines = [
    `# Questions on "${title}"`,
    '',
    'Pinned in Living Report, an unofficial reading layer for Lunon Deep Research report 51.',
  ];
  let section = '';
  for (const claim of claims) {
    const pinned = questions.filter(q => q.claimId === claim.id);
    if (pinned.length === 0) continue;
    if (claim.sectionId !== section) {
      section = claim.sectionId;
      lines.push('', `## ${sectionTitles.get(section) ?? section}`);
    }
    lines.push('', `> ${claim.text}`);
    for (const question of pinned) lines.push('', question.text.trim());
  }
  return `${lines.join('\n')}\n`;
}
