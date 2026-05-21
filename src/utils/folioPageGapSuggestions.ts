import type { Article } from '../data/articles';
import type { FolioArrangementItem } from '../types/issue';
import { hasFolioItemContent } from './folioPageRanges';

export interface FolioPageGapSuggestion {
  id: string;
  insertBeforeIndex: number;
  precedingEndPage: number;
}

const isFillerMatter = (item: FolioArrangementItem): boolean =>
  item.kind === 'matter'
  && (item.matterType === 'blank' || item.matterType === 'advertisement');

const getPrecedingEndPage = (
  items: FolioArrangementItem[],
  articleIndex: number,
  articlesById: Record<string, Article>,
): number | undefined => {
  for (let index = articleIndex - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (!hasFolioItemContent(item, articlesById)) continue;
    if (item.endPage !== undefined) return item.endPage;
  }
  return undefined;
};

/** Suggest blank or advertisement when content before an article ends on an odd page. */
export const getFolioPageGapSuggestions = (
  items: FolioArrangementItem[],
  articlesById: Record<string, Article>,
  dismissedIds: ReadonlySet<string>,
): FolioPageGapSuggestion[] => {
  const suggestions: FolioPageGapSuggestion[] = [];

  items.forEach((item, index) => {
    if (item.kind !== 'article' || !hasFolioItemContent(item, articlesById)) return;

    const prev = items[index - 1];
    if (prev && isFillerMatter(prev)) return;

    const precedingEndPage = getPrecedingEndPage(items, index, articlesById);
    if (precedingEndPage === undefined || precedingEndPage % 2 === 0) return;

    const id = `gap-before-${item.id}`;
    if (dismissedIds.has(id)) return;

    suggestions.push({
      id,
      insertBeforeIndex: index,
      precedingEndPage,
    });
  });

  return suggestions;
};

export const pruneDismissedGapSuggestions = (
  items: FolioArrangementItem[],
  articlesById: Record<string, Article>,
  dismissedIds: Set<string>,
): void => {
  const activeIds = new Set(
    getFolioPageGapSuggestions(items, articlesById, new Set()).map(s => s.id),
  );
  dismissedIds.forEach(id => {
    if (!activeIds.has(id)) dismissedIds.delete(id);
  });
};
