import { getNormalizedText } from '../getNormalizedText';

export function calculatePageIndexes(bodyChildren: Element[]): {
  startIndex: number;
  page: number;
  previousPageBreakId: string;
}[] {
  const pageIndexes: {
    startIndex: number;
    page: number;
    previousPageBreakId: string;
  }[] = [];
  let previousIndex = 0;

  bodyChildren.forEach((element, index) => {
    const isPotentialPage = (() => {
      const div = element.querySelector('div > div > div');
      return (
        div &&
        div
          .getAttribute('style')
          ?.replace(/\s/g, '')
          .includes('text-align:center')
      );
    })();
    const previousPageBreakId =
      bodyChildren
        .slice(0, index)
        .reverse()
        .find((child) => child.getAttribute('id'))
        ?.getAttribute('id') || '';

    if (!isPotentialPage) return;
    const text = getNormalizedText(element);
    if (!text) return;
    const page = parseInt(text);
    if (!isNaN(page)) {
      if (pageIndexes.length === 0) {
        pageIndexes.push({
          startIndex: previousIndex,
          page,
          previousPageBreakId,
        });
        previousIndex = index;
      } else {
        // Only add page if it makes sense, to prevent parsing wrong pages
        const previousPage = pageIndexes[pageIndexes.length - 1]?.page;
        if (previousPage && page === previousPage + 1) {
          pageIndexes.push({
            startIndex: previousIndex,
            page,
            previousPageBreakId,
          });
          previousIndex = index;
        }
      }
    }
  });

  return pageIndexes;
}
