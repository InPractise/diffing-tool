import { JSDOM } from 'jsdom';
import { getNormalizedText, normalizeText } from '../getNormalizedText';
import { SectionChild, ParsedDocument, Section } from '../types';
import { unwrapIxTagsRecursive } from './unwrapIxTagsRecursive';
import { calculatePageIndexes } from './calculatePageIndexes';
import { buildChildrenTree } from './buildChildrenTree';
import { isLeafChild } from './isLeafChild';
import { generateTableOfContents } from './generateTableOfContents';

export function parseFiling(html: string): ParsedDocument {
  const dom = new JSDOM(html);
  const { body } = dom.window.document;

  // Prepare document structure
  const bodyChildren = prepareDocumentStructure(body);
  const children = buildChildrenTree(
    bodyChildren,
    calculatePageIndexes(bodyChildren)
  );

  // Parse table of contents
  const tableOfContents = generateTableOfContents(children);

  // Process sections
  const tocChildren = getFilteredChildren(
    children.slice(0, tableOfContents[0]!.startingChildIndex)
  );
  let sections = [
    {
      title: 'Table of Contents',
      id: 'toc',
      children: tocChildren,
      pageStart: 1,
      pageEnd: [...new Set(tocChildren.map((child) => child.page))]
        .sort((a, b) => a - b)
        .pop(),
      depth: 0,
    },
  ] as Section[];

  for (let i = 0; i < tableOfContents.length; i++) {
    const entry = tableOfContents[i]!;
    const nextEntry = tableOfContents[i + 1];
    const endIndex = nextEntry ? nextEntry.startingChildIndex : children.length;

    let sectionChildren = getFilteredChildren(
      children.slice(entry.startingChildIndex, endIndex)
    );
    const pages = [...new Set(sectionChildren.map((child) => child.page))].sort(
      (a, b) => a - b
    );
    const pageStart = pages[0]!;
    const pageEnd = pages[pages.length - 1]!;

    sections.push({
      id: entry.id,
      title: entry.title,
      children: sectionChildren,
      depth: entry.depth,
      pageStart,
      pageEnd,
      type: entry.type,
    });
  }

  // amend pageEnd using the pageStart of the next section
  for (let i = 0; i < sections.length - 1; i++) {
    // find next section with same or lower depth
    let nextSectionIndex = i + 1;
    while (
      nextSectionIndex < sections.length &&
      sections[nextSectionIndex]!.depth > sections[i]!.depth
    ) {
      nextSectionIndex++;
    }

    if (nextSectionIndex < sections.length) {
      sections[i]!.pageEnd = sections[nextSectionIndex]!.pageStart;
    }
    // If we've reached the end, keep the original pageEnd
  }

  return { sections, tableOfContents };
}

export function prepareDocumentStructure(body: HTMLElement): Element[] {
  Array.from(body.children).forEach(unwrapIxTagsRecursive);
  return Array.from(body.children);
}

function getFilteredChildren(children: SectionChild[]): SectionChild[] {
  let filteredChildren: SectionChild[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    // filter hidden elements
    if (child.element.getAttribute('style') === 'display:none') continue;

    // filter empty elements
    const text = getNormalizedText(child.element);
    if (!text) continue;

    // filter pages
    if (/^\d+$/.test(text)) {
      // merge children with next one if they are on the same page
      let previousChildWithTextIndex = i - 1;
      for (
        previousChildWithTextIndex;
        previousChildWithTextIndex >= 0;
        previousChildWithTextIndex--
      ) {
        const previousChildWithText = children[previousChildWithTextIndex]!;
        if (previousChildWithText.element.textContent?.trim()) {
          break;
        }
      }

      let nextChildWithTextIndex = i + 1;
      for (
        nextChildWithTextIndex;
        nextChildWithTextIndex < children.length;
        nextChildWithTextIndex++
      ) {
        const nextChildWithText = children[nextChildWithTextIndex]!;
        if (nextChildWithText.element.textContent?.trim()) {
          break;
        }
      }

      const previousChild = children[previousChildWithTextIndex];
      const nextChild = children[nextChildWithTextIndex];

      if (!previousChild || !nextChild) {
        continue;
      }

      const previousChildTextContent =
        previousChild.element.textContent?.trim();
      const nextChildTextContent = nextChild.element.textContent?.trim();
      const previousEndsWithPeriod = previousChildTextContent?.endsWith('.');
      const nextStartsWithCapitalLetter = /^[A-Z]/.test(
        nextChildTextContent || ''
      );
      const shouldMerge =
        !previousEndsWithPeriod && !nextStartsWithCapitalLetter;

      if (shouldMerge) {
        filteredChildren[filteredChildren.length - 1]!.element.innerHTML +=
          ' ' + children[nextChildWithTextIndex]!.element.innerHTML;
        i = nextChildWithTextIndex;
      }
      continue;
    }

    const isTableOfContentsLink =
      text === 'table of contents' && !!child.element.querySelector('a');
    if (isTableOfContentsLink) {
      continue;
    }

    filteredChildren.push(child);
  }

  return filteredChildren;
}
