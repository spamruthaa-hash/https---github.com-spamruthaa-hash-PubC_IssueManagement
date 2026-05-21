import type { Article } from '../data/articles';
import type { FolioArrangementItem, FolioMatterType } from '../types/issue';

export const createBlankFolioItem = (): FolioArrangementItem => ({
  id: `matter-blank-${Date.now()}`,
  kind: 'matter',
  matterType: 'blank',
});
/** Default page counts when an uploaded file has no detected page count. */
export const DEFAULT_MATTER_PAGE_COUNTS: Record<FolioMatterType, number> = {
  coversheet: 1,
  masthead: 1,
  'table-of-contents': 1,
  'call-for-papers': 1,
  advertisement: 1,
  'upcoming-issue': 1,
  blank: 0,
};

export const hasFolioItemContent = (
  item: FolioArrangementItem,
  articlesById: Record<string, Article>,
): boolean => {
  if (item.kind === 'article') {
    return Boolean(articlesById[item.articleId]);
  }
  if (item.matterType === 'blank') return true;
  return Boolean(item.file);
};

export const getMatterPageCount = (
  item: Extract<FolioArrangementItem, { kind: 'matter' }>,
): number => {
  if (item.matterType === 'blank') return 1;
  if (!item.file) return 0;
  return item.file.pageCount ?? DEFAULT_MATTER_PAGE_COUNTS[item.matterType];
};

export const getFolioItemPageCount = (
  item: FolioArrangementItem,
  articlesById: Record<string, Article>,
): number => {
  if (!hasFolioItemContent(item, articlesById)) return 0;
  if (item.kind === 'article') {
    return articlesById[item.articleId]?.pages ?? Math.max(1, item.endPage - item.startPage + 1);
  }
  return getMatterPageCount(item);
};

export const formatPageRangeLabel = (startPage: number, endPage: number): string =>
  startPage === endPage ? String(startPage) : `${startPage}-${endPage}`;

const stripPageRange = (item: FolioArrangementItem): FolioArrangementItem => {
  if (item.kind === 'article') {
    return { id: item.id, kind: item.kind, articleId: item.articleId, startPage: 1, endPage: 1 };
  }
  return {
    id: item.id,
    kind: item.kind,
    matterType: item.matterType,
    ...(item.file ? { file: item.file } : {}),
  };
};

/** Assign sequential page ranges only for rows that have content (file or article). */
export const recalculateFolioPageRanges = (
  items: FolioArrangementItem[],
  articlesById: Record<string, Article>,
): FolioArrangementItem[] => {
  let currentStart = 1;

  return items.map(item => {
    if (!hasFolioItemContent(item, articlesById)) {
      return stripPageRange(item);
    }

    const pageCount = getFolioItemPageCount(item, articlesById);
    if (pageCount <= 0) {
      return stripPageRange(item);
    }

    const startPage = currentStart;
    const endPage = startPage + pageCount - 1;
    currentStart = endPage + 1;

    return { ...item, startPage, endPage };
  });
};

/** Pages / range cells for tables — empty until content exists. */
export const getFolioItemPageDisplay = (
  item: FolioArrangementItem,
  articlesById: Record<string, Article>,
): { pages: number | null; pageRange: string | null } => {
  if (!hasFolioItemContent(item, articlesById)) {
    return { pages: null, pageRange: null };
  }

  const pages = getFolioItemPageCount(item, articlesById);
  if (
    pages <= 0
    || item.startPage === undefined
    || item.endPage === undefined
  ) {
    return { pages: null, pageRange: null };
  }

  return {
    pages,
    pageRange: formatPageRangeLabel(item.startPage, item.endPage),
  };
};
