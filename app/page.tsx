import {Brief} from '@/components/brief.tsx';
import {HeadingText} from '@/components/heading-text.tsx';
import {ProvenanceToggle} from '@/components/provenance-toggle.tsx';
import {QuestionsMenu} from '@/components/questions-menu.tsx';
import {Reader} from '@/components/reader.tsx';
import {ClaimChip} from '@/components/claim-chip.tsx';
import {ReaderProvider} from '@/components/reader-state.tsx';
import {
  ContentsMenu,
  Outline,
  type NavItem,
} from '@/components/section-nav.tsx';
import {SourceCards} from '@/components/source-cards.tsx';
import {SourcesIndex} from '@/components/sources-index.tsx';
import {ThemeToggle} from '@/components/theme-toggle.tsx';
import {selectBrief} from '@/lib/report/brief.ts';
import {readReportMarkdown} from '@/lib/report/content.ts';
import {parseReport} from '@/lib/report/parse.ts';

const REPORT_URL =
  'https://github.com/LunonAI/lunon-deep-research/blob/4c1d00149087fd2b7703e84fbb707f08724aeaca/submission/reports/51.md';
const REPO_URL = 'https://github.com/uzoway/lunon-living-report';

// Parsed once, at build time. Every surface below renders from this model.
const report = parseReport(readReportMarkdown());
const brief = selectBrief(report);
const sources = new Map(report.sources.map(s => [s.id, s]));
const sections = report.sections.map(({id, title}) => ({id, title}));
const claims = report.claims.map(({id, sectionId, sourceIds}) => ({
  id,
  sectionId,
  sourceIds,
}));
const navItems: NavItem[] = [
  {id: 'brief', title: 'Brief'},
  ...report.sections
    .filter(s => s.depth === 2)
    .map(({id, title}) => ({id, title})),
];

// Next.js only reads a default export here (an exception to named exports).
export default function Page() {
  return (
    <ReaderProvider
      title={report.title}
      claims={claims}
      sources={report.sources}
      sections={sections}
    >
      <a className="skip-link" href="#main">
        Skip to the report
      </a>
      <header className="site-header">
        <div className="frame flex h-full items-center gap-1">
          <p className="brand">
            Living Report
            <span className="brand-note">concept</span>
          </p>
          <div className="flex min-w-0 flex-1">
            <ContentsMenu items={navItems} />
          </div>
          <ProvenanceToggle figures={brief.evidence.figures} />
          <QuestionsMenu />
          <ThemeToggle />
        </div>
      </header>

      <div className="frame layout">
        <Outline items={navItems} />
        <main id="main" tabIndex={-1} className="outline-none">
          <div className="page-head">
            <h1 className="title">
              <HeadingText text={report.title} />
            </h1>
            <p className="disclaimer">
              Unofficial concept by Uzo Okafor. Not affiliated with Lunon.
              Report text from{' '}
              <a href={REPORT_URL}>Lunon Deep Research (MIT), unmodified</a>.
            </p>
          </div>
          <Brief brief={brief} sources={sources} />
          <p className="provenance-legend">
            Provenance labels, worked out by this page&rsquo;s parser:{' '}
            <strong>Cited</strong> means the claim links a source;{' '}
            <strong>Modeled</strong> means the report calls the figure its own
            model output; <strong>Not attributed</strong> means neither. They
            show where a figure points, not whether a source supports it.
          </p>
          <Reader sections={report.sections} sources={sources} />
          <SourcesIndex />
        </main>
        <footer className="page-footer">
          <p>Unofficial concept by Uzo Okafor. Not affiliated with Lunon.</p>
          <p>
            Report text: Lunon Deep Research, report 51 at commit 4c1d001, ©
            2026 Lunon, MIT license, shown unmodified.{' '}
            <a href={REPORT_URL}>View the original</a>.
          </p>
          <p>
            Code: © 2026 Uzo Okafor, MIT license.{' '}
            <a href={REPO_URL}>Source on GitHub</a>.
          </p>
        </footer>
        <div id="rail" className="rail" aria-hidden />
      </div>

      <SourceCards />
      <ClaimChip />
      <p id="announcer" className="sr-only" aria-live="polite" />
    </ReaderProvider>
  );
}
