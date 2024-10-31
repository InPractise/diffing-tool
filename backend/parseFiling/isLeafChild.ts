import { SectionChild, Section } from '../types';

// Helper functions
export function isLeafChild(
  child: SectionChild | Section
): child is SectionChild {
  return !('children' in child);
}
