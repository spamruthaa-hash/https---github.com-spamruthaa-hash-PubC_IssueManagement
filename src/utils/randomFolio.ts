import { ARTICLES_BY_JOURNAL } from '../data/articles';
import type { FolioArrangementItem, FolioFileAttachment, FolioMatterType, Issue } from '../types/issue';

const FRONT_MATTER: FolioMatterType[] = ['coversheet', 'masthead', 'table-of-contents'];
const BACK_MATTER: FolioMatterType[] = ['advertisement', 'upcoming-issue'];

const MIN_ARTICLES = 5;
const MAX_ARTICLES = 8;

/** Plausible page counts so the generated folio reads like a real one. */
const MATTER_PAGE_RANGE: Record<FolioMatterType, [number, number]> = {
  coversheet: [1, 1],
  masthead: [1, 2],
  'table-of-contents': [1, 3],
  'call-for-papers': [1, 2],
  advertisement: [1, 4],
  'upcoming-issue': [1, 2],
  blank: [1, 1],
};

const randomInt = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

const shuffle = <T>(values: T[]): T[] => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const toFileNamePart = (matterType: FolioMatterType): string =>
  matterType
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('_');

const buildMatterFile = (issue: Issue, matterType: FolioMatterType): FolioFileAttachment => {
  const [minPages, maxPages] = MATTER_PAGE_RANGE[matterType];
  const acronym = issue.journalAcronym || 'Folio';

  return {
    name: `${acronym}_${toFileNamePart(matterType)}.pdf`,
    size: randomInt(120, 900) * 1024,
    type: 'application/pdf',
    pageCount: randomInt(minPages, maxPages),
    uploadedAt: issue.folioPreparationConfirmedAt ?? issue.folioPreparationStartedAt ?? issue.createdAt,
    uploadedBy: 'TNQ',
  };
};

/**
 * Builds a throwaway folio for issues that never went through folio creation
 * (John D uploads a ready-made folio instead), so Folio Review has content to show.
 */
export const buildRandomFolioArrangementItems = (issue: Issue): FolioArrangementItem[] => {
  const pool = ARTICLES_BY_JOURNAL[issue.journalId] ?? [];
  const articleCount = Math.min(pool.length, randomInt(MIN_ARTICLES, MAX_ARTICLES));

  const articleItems: FolioArrangementItem[] = shuffle(pool)
    .slice(0, articleCount)
    .map(article => ({
      id: `article-${article.id}`,
      kind: 'article',
      articleId: article.id,
      startPage: 1,
      endPage: 1,
    }));

  const matterItem = (matterType: FolioMatterType): FolioArrangementItem => ({
    id: `matter-${matterType}`,
    kind: 'matter',
    matterType,
    file: buildMatterFile(issue, matterType),
  });

  return [
    ...FRONT_MATTER.map(matterItem),
    ...articleItems,
    ...BACK_MATTER.map(matterItem),
  ];
};
