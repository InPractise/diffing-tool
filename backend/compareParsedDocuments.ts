import { cleanupSemantic, makeDiff } from '@sanity/diff-match-patch';
import crypto from 'crypto';
import * as levenshtein from 'fast-levenshtein';
import TurndownService from 'turndown';
import { getNormalizedText, normalizeText } from './getNormalizedText';
import {
  SectionChild,
  ChildCompared,
  ChildComparedChild,
  ComparedDocument,
  ComparedSection,
  ParsedDocument,
} from './types';

// const calculateTextDiff = (oldText: string, newText: string) => {
//   const diff = diffWords(oldText, newText, {});
//   return diff
//     .map((part) => {
//       if (part.added) {
//         return `<span style="background-color: #e6ffed; color: #24292e;">${part.value}</span>`;
//       }
//       if (part.removed) {
//         return `<span style="background-color: #ffeef0; color: #24292e; text-decoration: line-through;">${part.value}</span>`;
//       }
//       return part.value;
//     })
//     .join('');
// };

const turndownService = new TurndownService();

function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshtein.get(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

const getMatchedChildrenIndexes = (
  childrenNew: SectionChild[],
  childrenOld: SectionChild[]
) => {
  const childrenOldText = childrenOld.map((c) => getNormalizedText(c.element));

  type ChildWithIndex = {
    child: SectionChild;
    textContent?: string;
    oldIndex?: number;
    newIndex?: number;
  };
  // const matchedIndexes: { newIndex: number; oldIndex: number }[] = [];

  // First pass: Exact matches
  let previousOldMatchIndex = 0;
  const children1Pass: ChildWithIndex[] = childrenNew
    .map((child) => {
      const textContent = getNormalizedText(child.element);
      if (!textContent) return { child };
      return { child, textContent };
    })
    .map((child, index) => {
      if (!child?.textContent) return child;
      const oldIndex = childrenOldText.indexOf(
        child.textContent,
        previousOldMatchIndex
      );
      if (oldIndex !== -1) {
        previousOldMatchIndex = oldIndex + 1;
        return { ...child, newIndex: index, oldIndex };
      }
      return child;
    });

  const getMatchableOldChildren = (
    children: ChildWithIndex[],
    newIndex: number
  ) => {
    const childrenBeforeNewIndex = children.slice(0, newIndex);
    const lastMatchedOldIndex =
      childrenBeforeNewIndex.reverse().find((child) => child.oldIndex)
        ?.oldIndex || 0;

    const childrenAfterNewIndex = children.slice(newIndex + 1);
    const nextMatchedOldIndex =
      childrenAfterNewIndex.find((child) => child.oldIndex)?.oldIndex ||
      childrenOld.length - 1;

    const matchableOldChildren = childrenOld.slice(
      lastMatchedOldIndex,
      nextMatchedOldIndex
    );

    return {
      children: matchableOldChildren,
      startIndex: lastMatchedOldIndex,
      endIndex: nextMatchedOldIndex,
    };
  };

  // Second pass: Similar matches (0.9 threshold)
  const children2Pass = children1Pass.map((child, index) => {
    const textContent = child.textContent;
    if (!textContent) return child;
    const matchableOldChildren = getMatchableOldChildren(children1Pass, index);
    const bestMatchIndex = matchableOldChildren.children.reduce(
      (best, oldChild, currentIndex) => {
        const similarity = calculateSimilarity(
          childrenOldText[currentIndex + matchableOldChildren.startIndex]!,
          textContent
        );
        return similarity > 0.9 &&
          (best === -1 ||
            similarity >
              calculateSimilarity(childrenOldText[best]!, textContent))
          ? currentIndex
          : best;
      },
      -1
    );

    if (bestMatchIndex !== -1) {
      return {
        ...child,
        oldIndex: bestMatchIndex + matchableOldChildren.startIndex,
        newIndex: index,
      };
    }

    return child;
  });

  // Third pass: Less similar matches (0.5 threshold)
  const children3Pass = children2Pass.map((child, index) => {
    const textContent = child.textContent;
    if (!textContent) return child;
    const matchableOldChildren = getMatchableOldChildren(children2Pass, index);
    const bestMatchIndex = matchableOldChildren.children.reduce(
      (best, oldChild, currentIndex) => {
        const similarity = calculateSimilarity(
          childrenOldText[currentIndex + matchableOldChildren.startIndex]!,
          textContent
        );
        return similarity > 0.5 &&
          (best === -1 ||
            similarity >
              calculateSimilarity(childrenOldText[best]!, textContent))
          ? currentIndex
          : best;
      },
      -1
    );

    if (bestMatchIndex !== -1) {
      return {
        ...child,
        oldIndex: bestMatchIndex + matchableOldChildren.startIndex,
        newIndex: index,
      };
    }

    return child;
  });

  return children3Pass.filter(
    (
      child
    ): child is {
      child: SectionChild;
      textContent: string;
      oldIndex: number;
      newIndex: number;
    } => {
      return child.oldIndex !== undefined && child.newIndex !== undefined;
    }
  );
};

const getDiffText = (child: SectionChild): string => {
  if (child.type === 'table') {
    const tableText = turndownService.turndown(
      child.element.outerHTML.replace(/href="#[^"]*"/g, '')
    );
    const hash = crypto.createHash('md5').update(tableText).digest('hex');
    return `Table hash: ${hash}`;
  }

  return (
    turndownService
      .turndown(child.element.outerHTML.replace(/href="#[^"]*"/g, ''))
      // ensure there is exactly one space after the bullet point
      .replace(/•\s*/g, '• ')
  );
};

const createChildObject = (child: SectionChild): ChildComparedChild => ({
  type: child.type,
  html: child.element.outerHTML,
  markdown: turndownService.turndown(child.element.outerHTML),
  page: child.page,
  previousPageBreakId: child.previousPageBreakId,
});

const addMatchedChildren = (
  oldChildren: SectionChild[],
  newChildren: SectionChild[],
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number
): ChildCompared[] => {
  const childrenOld = oldChildren.slice(oldStart, oldEnd);
  const childrenNew = newChildren.slice(newStart, newEnd);

  if (childrenOld.length === 0 && childrenNew.length === 0) {
    return [];
  }

  if (childrenOld.length === 0) {
    return childrenNew.map((child) => {
      const diff = cleanupSemantic(makeDiff('', getDiffText(child)));
      const diffStatus = calculateDiffStatus(diff);
      return {
        childrenOld: [],
        childrenNew: [createChildObject(child)],
        diff,
        ...diffStatus,
      };
    });
  }

  if (childrenNew.length === 0) {
    return childrenOld.map((child) => {
      const diff = cleanupSemantic(makeDiff(getDiffText(child), ''));
      const diffStatus = calculateDiffStatus(diff);
      return {
        childrenOld: [createChildObject(child)],
        childrenNew: [],
        diff,
        ...diffStatus,
      };
    });
  }

  const diff = cleanupSemantic(
    makeDiff(
      oldChildren.slice(oldStart, oldEnd).map(getDiffText).join('\n\n'),
      newChildren.slice(newStart, newEnd).map(getDiffText).join('\n\n')
    )
  );
  const diffStatus = calculateDiffStatus(diff);
  return [
    {
      childrenOld: childrenOld.map(createChildObject),
      childrenNew: childrenNew.map(createChildObject),
      diff,
      ...diffStatus,
    },
  ];
};

type DiffStatus = {
  added: boolean;
  removed: boolean;
  changed: boolean;
};

const calculateDiffStatus = (diff: [number, string][]): DiffStatus => {
  const added =
    diff.some((part) => part[0] === 1) && diff.every((part) => part[0] !== -1);
  const removed =
    diff.some((part) => part[0] === -1) && diff.every((part) => part[0] !== 1);
  const changed = diff.some((part) => part[0] !== 0);
  return { added, removed, changed };
};

export const compareParsedDocuments = (
  docNew: ParsedDocument,
  docOld: ParsedDocument
): ComparedDocument => {
  let previousOldSectionMatchedIndex = -1;
  let sections: ComparedSection[] = [];

  console.log(`Comparing ${docNew.sections.length} sections`);

  docNew.sections.forEach((newSection, newSectionIndex) => {
    let oldSectionIndex = docOld.sections
      .slice(
        Math.max(previousOldSectionMatchedIndex, 0),
        docOld.sections.length
      )
      .findIndex((oldSection) => oldSection.title === newSection.title);

    // New sections
    if (oldSectionIndex === -1) {
      sections.push({
        id: newSection.id,
        title: newSection.title,
        pageStart: newSection.pageStart,
        pageEnd: newSection.pageEnd,
        children: newSection.children.map((child) => {
          const diff = cleanupSemantic(makeDiff('', getDiffText(child)));
          const diffStatus = calculateDiffStatus(diff);
          return {
            childrenOld: [],
            childrenNew: [
              {
                type: child.type,
                html: child.element.outerHTML,
                markdown: turndownService.turndown(child.element.outerHTML),
                page: child.page,
                previousPageBreakId: child.previousPageBreakId,
              },
            ],
            diff,
            ...diffStatus,
          };
        }),
        depth: newSection.depth,
        type: newSection.type,
      });
      return;
    }

    oldSectionIndex =
      oldSectionIndex + Math.max(previousOldSectionMatchedIndex, 0);

    // Handle removed sections
    if (oldSectionIndex - previousOldSectionMatchedIndex > 1) {
      for (
        let i = previousOldSectionMatchedIndex + 1;
        i < oldSectionIndex;
        i++
      ) {
        const oldSectionRemoved = docOld.sections[i]!;
        sections.push({
          id: oldSectionRemoved.id,
          title: oldSectionRemoved.title,
          pageStart: oldSectionRemoved.pageStart,
          pageEnd: oldSectionRemoved.pageEnd,
          children: oldSectionRemoved.children.map((child) => {
            const diff = cleanupSemantic(makeDiff('', getDiffText(child)));
            const diffStatus = calculateDiffStatus(diff);
            return {
              childrenOld: [
                {
                  type: child.type,
                  html: child.element.outerHTML,
                  markdown: turndownService.turndown(child.element.outerHTML),
                  page: child.page,
                  previousPageBreakId: child.previousPageBreakId,
                },
              ],
              childrenNew: [],
              diff,
              ...diffStatus,
            };
          }),
          depth: oldSectionRemoved.depth,
          type: oldSectionRemoved.type,
        });
      }
      return;
    }

    const el = newSection.children.find(
      (c) =>
        getNormalizedText(c.element) &&
        getNormalizedText(c.element)!.includes(
          normalizeText(
            'Brand name merchandise represents a significant portion of the merchandise sold in Walmart U.S. We also market lines of merchandise under our'
          )
        )
    );

    // Handle matched sections

    previousOldSectionMatchedIndex = oldSectionIndex;
    const oldSection = docOld.sections[oldSectionIndex]!;
    const matchedChildrenIndexes = getMatchedChildrenIndexes(
      newSection.children,
      oldSection?.children || []
    );

    let matchedChildren: ChildCompared[] = [];
    let previousOldMatchIndex = -1;
    let previousNewMatchIndex = -1;

    for (let i = 0; i < matchedChildrenIndexes.length; i++) {
      const match = matchedChildrenIndexes[i]!;

      if (previousOldMatchIndex !== -1) {
        // Add matched child
        matchedChildren.push(
          ...addMatchedChildren(
            oldSection.children,
            newSection.children,
            previousOldMatchIndex,
            previousOldMatchIndex + 1,
            previousNewMatchIndex,
            previousNewMatchIndex + 1
          )
        );

        // Add unmatched children between previous match and current match
        const unmatched = addMatchedChildren(
          oldSection.children,
          newSection.children,
          previousOldMatchIndex + 1,
          match.oldIndex,
          previousNewMatchIndex + 1,
          match.newIndex
        );
        for (const unmatchedChild of unmatched) {
          if (
            unmatchedChild.childrenOld.length > 0 ||
            unmatchedChild.childrenNew.length > 0
          ) {
            matchedChildren.push(unmatchedChild);
          }
        }
      }

      previousOldMatchIndex = match.oldIndex;
      previousNewMatchIndex = match.newIndex;
    }

    // Handle remaining unmatched children at the end
    const remainingUnmatched = addMatchedChildren(
      oldSection.children,
      newSection.children,
      previousOldMatchIndex + 1,
      oldSection.children.length,
      previousNewMatchIndex + 1,
      newSection.children.length
    );
    for (const unmatchedChild of remainingUnmatched) {
      if (
        unmatchedChild.childrenOld.length > 0 ||
        unmatchedChild.childrenNew.length > 0
      ) {
        matchedChildren.push(unmatchedChild);
      }
    }

    sections.push({
      id: newSection.id,
      title: newSection.title,
      pageStart: newSection.pageStart,
      pageEnd: newSection.pageEnd,
      children: matchedChildren,
      depth: newSection.depth,
      type: newSection.type,
    });
  });

  // handle remaining removed sections
  if (docOld.sections.length - previousOldSectionMatchedIndex > 1) {
    for (
      let i = previousOldSectionMatchedIndex + 1;
      i < docOld.sections.length;
      i++
    ) {
      const oldSectionRemoved = docOld.sections[i]!;
      sections.push({
        id: oldSectionRemoved.id,
        title: oldSectionRemoved.title,
        pageStart: oldSectionRemoved.pageStart,
        pageEnd: oldSectionRemoved.pageEnd,
        children: oldSectionRemoved.children.map((child) => {
          const diff = cleanupSemantic(makeDiff('', getDiffText(child)));
          const diffStatus = calculateDiffStatus(diff);
          return {
            childrenOld: [
              {
                type: child.type,
                html: child.element.outerHTML,
                markdown: turndownService.turndown(child.element.outerHTML),
                page: child.page,
                previousPageBreakId: child.previousPageBreakId,
              },
            ],
            childrenNew: [],
            diff,
            ...diffStatus,
          };
        }),
        depth: oldSectionRemoved.depth,
        type: oldSectionRemoved.type,
      });
    }
  }

  console.log(`Comparison complete. Total sections: ${sections.length}`);
  return { sections };
};
