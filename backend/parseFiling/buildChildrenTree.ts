import { SectionChild } from '../types';

export function buildChildrenTree(
  bodyChildren: Element[],
  pageIndexes: {
    startIndex: number;
    page: number;
    previousPageBreakId: string;
  }[]
): SectionChild[] {
  return bodyChildren.map((element, index): SectionChild => {
    let type: SectionChild['type'] = 'general';
    // check if there is span with (number)
    const span = element.querySelector('span');
    if (span && /^\(\d+\)$/.test(span.textContent || '')) {
      type = 'footnote';
    }

    // Recursively check if there is a table
    const hasTable = (el: Element): boolean => {
      if (el.tagName.toLowerCase() === 'table') {
        return true;
      }
      return Array.from(el.children).some(hasTable);
    };

    if (hasTable(element)) {
      type = 'table';
    }

    let title: string = '';
    const spanBolded = element.querySelector(
      'span[style*="font-weight: bold"]'
    );
    if (spanBolded && !element.textContent?.includes('\n')) {
      title = spanBolded.textContent || '';
      type = 'subsection-title';
    }

    let page = 1;
    let previousPageBreakId: string = '';
    for (const pageIndex of pageIndexes) {
      if (index >= pageIndex.startIndex) {
        page = pageIndex.page;
        previousPageBreakId = pageIndex.previousPageBreakId;
      }
    }

    return {
      element,
      type,
      page,
      previousPageBreakId,
      title,
    };
  });
}
