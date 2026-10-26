/**
 * A claim's text as the reader sees it, without markers or provenance
 * labels. The page already carries every sentence, so the questions panel
 * reads it here instead of shipping the report's text a second time.
 * Table rows read cell by cell, as the parser joins them.
 */
export function claimText(claimId: string): string {
  const element = document.querySelector(`#report [data-claim="${claimId}"]`);
  if (element instanceof HTMLTableRowElement) {
    return [...element.cells].map(visibleText).join(' | ');
  }
  return element ? visibleText(element) : '';
}

function visibleText(element: Element): string {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) return '';
  clone
    .querySelectorAll('.marker, .provenance')
    .forEach(added => added.remove());
  return (clone.textContent ?? '').trim();
}
