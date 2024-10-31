import { SectionChild, TableOfContentsEntry } from '../types';
import { getNormalizedText, normalizeText } from '../getNormalizedText';

export function generateTableOfContents(
  children: SectionChild[]
): TableOfContentsEntry[] {
  const tocEntries: TableOfContentsEntry[] = [];
  let isWithinTOC = false;

  let depth = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const text = getNormalizedText(child.element)?.toLowerCase() || '';

    if (!isWithinTOC && text.includes('table of contents')) {
      // Found the start of a Table of Contents
      isWithinTOC = true;
      continue;
    }

    if (isWithinTOC) {
      // Check if the child is a table (assumed to be the TOC table)
      if (child.type === 'table') {
        const tableElement = child.element as HTMLTableElement;
        const entries = parseToCTable(tableElement, depth, children);
        tocEntries.push(...entries);
        isWithinTOC = false; // Assuming TOC ends after the table
        depth = 1;
      } else {
        // If not a table, continue to next child
        continue;
      }
    }
  }

  // sort tocEntries by startingPage
  tocEntries.sort((a, b) => a.startingPage - b.startingPage);

  parseNotesToConsolidatedFinancialStatements(children, tocEntries);

  return tocEntries;
}

const notesTitleRegex =
  /^(Notes|Footnotes)\s*(to|for|-)?\s*(the\s*)?(Audited\s*)?((Consolidated|Combined)\s*)?Financial\s+Statements$/i;

export function parseNotesToConsolidatedFinancialStatements(
  children: SectionChild[],
  tocEntries: TableOfContentsEntry[]
) {
  const notesToConsolidatedFinancialStatementsIndex = tocEntries.findIndex(
    (entry) => notesTitleRegex.test(entry.title)
  );
  const notesToConsolidatedFinancialStatements =
    tocEntries[notesToConsolidatedFinancialStatementsIndex];
  let followingSectionStartingChildIndex =
    tocEntries[notesToConsolidatedFinancialStatementsIndex + 1]
      ?.startingChildIndex || 0;
  followingSectionStartingChildIndex =
    followingSectionStartingChildIndex < 1
      ? children.length
      : followingSectionStartingChildIndex;

  if (
    notesToConsolidatedFinancialStatements &&
    followingSectionStartingChildIndex
  ) {
    // Find all the notes
    const notes: TableOfContentsEntry[] = [];
    const noteRegex = /^(Note)?(s)?\s*(\d+)\s*[-.]\s*/i;

    for (
      let i = notesToConsolidatedFinancialStatements.startingChildIndex;
      i < followingSectionStartingChildIndex;
      i++
    ) {
      const child = children[i]!;
      if (child.type === 'general' || child.type === 'subsection-title') {
        // get the data-ix-name attribute of the child.element
        const ixName = child.element
          .querySelector('span')
          ?.getAttribute('data-ix-name');

        if (ixName) {
          const text = child.element.textContent?.trim() || '';
          const match = text.match(noteRegex);

          if (match) {
            const noteNumber = parseInt(match[3] || '', 10);
            const noteTitle = text.replace(noteRegex, '').trim();

            const type = normalizeText(noteTitle).includes(
              'accounting policies'
            )
              ? 'accounting-policies'
              : 'general';

            notes.push({
              id: `consolidated-financial-statement-note-${noteNumber}`,
              title: `Note ${noteNumber} - ${noteTitle}`,
              startingPage: notesToConsolidatedFinancialStatements.startingPage,
              depth: notesToConsolidatedFinancialStatements.depth + 1,
              startingChildIndex: i,
              type,
            });
          }
        }
      }
    }

    tocEntries.splice(
      notesToConsolidatedFinancialStatementsIndex + 1,
      0,
      ...notes
    );
  }
}

function parseToCTable(
  tableElement: HTMLTableElement,
  depth: number,
  children: SectionChild[]
): TableOfContentsEntry[] {
  const entries: TableOfContentsEntry[] = [];
  const rows = tableElement.querySelectorAll('tr');

  for (const row of rows) {
    const entry = parseToCTableRow(row as HTMLTableRowElement, depth, children);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

function parseToCTableRow(
  row: HTMLTableRowElement,
  depth: number,
  children: SectionChild[]
): TableOfContentsEntry | null {
  const links = Array.from(row.querySelectorAll('a[href]'));
  if (links.length === 0) {
    return null;
  }

  let id = '';
  let titleParts: string[] = [];
  let page = '';

  for (const link of links) {
    const href = link.getAttribute('href');
    const text = link.textContent?.trim() || '';

    if (href && !id) {
      // Extract the hashtag ID from the href, ignoring any query string
      const url = new URL(href, 'http://dummy.com');
      id = url.hash.slice(1); // Remove the leading '#'
    }

    if (text.match(/^\d+$/)) {
      // If text is a number, it's the page number
      page = text;
    } else {
      // Accumulate title parts (some entries have split titles across multiple links)
      titleParts.push(text);
    }
  }

  const title = titleParts.join(' ').trim();

  const startingChildIndex = children.findIndex(
    (child) => child.element.getAttribute('id') === id
  );

  if (id && title && page) {
    const startingPage = parseInt(page, 10);
    return {
      id,
      title,
      startingPage,
      depth,
      startingChildIndex,
      type: normalizeText(title).includes('risk factors')
        ? '1a-risk-factors'
        : 'general',
    };
  }

  return null;
}
