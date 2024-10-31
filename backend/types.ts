import { Diff } from '@sanity/diff-match-patch';

export type ChildType = 'general' | 'footnote' | 'table' | 'subsection-title';

export type SectionChild =
  | {
      element: Element;
      type: 'general' | 'footnote' | 'table';
      page: number;
      previousPageBreakId: string | null;
    }
  | {
      element: Element;
      type: 'subsection-title';
      title: string;
      page: number;
      previousPageBreakId: string | null;
    };

export type SectionType = 'general' | 'accounting-policies' | '1a-risk-factors';

export interface Section {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  children: SectionChild[];
  depth: number;
  type: SectionType;
}

export interface TableOfContentsEntry {
  id: string;
  title: string;
  startingPage: number;
  depth: number;
  startingChildIndex: number;
  type: SectionType;
}

export interface ParsedDocument {
  sections: Section[];
  tableOfContents: TableOfContentsEntry[];
}

export type ChildComparedChild = {
  html: string;
  markdown: string;
  type: ChildType;
  page: number;
  previousPageBreakId: string | null;
};

export type ChildCompared = {
  childrenOld: ChildComparedChild[];
  childrenNew: ChildComparedChild[];
  diff: Diff[];
  added: boolean;
  removed: boolean;
  changed: boolean;
};

export type ComparedSection = {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  children: ChildCompared[];
  depth: number;
  type: SectionType;
};

export type ComparedDocument = {
  sections: ComparedSection[];
};
