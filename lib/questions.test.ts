import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {Root} from 'mdast';
import remarkParse from 'remark-parse';
import {unified} from 'unified';

import {questionsToMarkdown, type Question} from './questions.ts';
import {readReportMarkdown} from './report/content.ts';
import {parseReport} from './report/parse.ts';

const report = parseReport(readReportMarkdown());
const context = {
  title: report.title,
  claims: report.claims,
  sectionTitles: new Map(report.sections.map(s => [s.id, s.title])),
};

function question(claimId: string, text: string): Question {
  return {id: `q-${claimId}-${text.length}`, claimId, text, createdAt: ''};
}

describe('questionsToMarkdown', () => {
  // Pinned out of order, to check the export follows the report.
  const questions = [
    question('c403', 'What happens to the care line at 500,000 workers?'),
    question('c4', 'Which households drive the 1.1% fall?'),
    question('c4', 'Is 2024 an outlier?\n\nCompare 2019.'),
  ];
  const markdown = questionsToMarkdown(questions, context);
  const tree: Root = unified().use(remarkParse).parse(markdown);

  it('is valid Markdown with a heading per section and a quote per claim', () => {
    const types = tree.children.map(node =>
      node.type === 'heading' ? `h${node.depth}` : node.type
    );
    assert.deepEqual(types, [
      'h1',
      'paragraph',
      'h2',
      'blockquote',
      'paragraph',
      'paragraph',
      'paragraph',
      'h2',
      'blockquote',
      'paragraph',
    ]);
  });

  it('follows reading order and quotes the claim as written', () => {
    assert.match(
      markdown,
      /## Executive Summary\n\n> Real consumption per elderly head/
    );
    assert.ok(
      markdown.indexOf('## Executive Summary') < markdown.indexOf('## 11.5')
    );
  });

  it('exports nothing but the title when there are no questions', () => {
    assert.equal(questionsToMarkdown([], context).split('\n## ').length, 1);
  });
});
