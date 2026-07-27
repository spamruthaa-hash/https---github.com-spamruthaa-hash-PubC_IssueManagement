import { buildArticlesById, getLineupArticlesForJournal } from './lineupArticles';
import type { FolioArrangementItem, FolioMatterType, Issue } from '../types/issue';

const DEFAULT_REQUIRED_MATTER: FolioMatterType[] = ['coversheet', 'masthead', 'table-of-contents'];

const matterItem = (matterType: FolioMatterType): FolioArrangementItem => ({
  id: `matter-${matterType}`,
  kind: 'matter',
  matterType,
});

const articleItem = (articleId: string): FolioArrangementItem => ({
  id: `article-${articleId}`,
  kind: 'article',
  articleId,
  startPage: 1,
  endPage: 1,
});

/** Default folio sequence used in Arrange Folio when nothing has been saved yet. */
export const buildDefaultFolioArrangementItems = (issue: Issue): FolioArrangementItem[] => {
  const articlesById = buildArticlesById(getLineupArticlesForJournal(issue.journalId, issue.externalArticles));

  const articleItems = issue.assignedArticleIds
    .filter(articleId => articlesById[articleId])
    .map(articleItem);

  return [...DEFAULT_REQUIRED_MATTER.map(matterItem), ...articleItems];
};

const hasFolioWorkflowProgress = (issue: Issue): boolean =>
  Boolean(
    issue.folioArrangementConfirmedAt
    || issue.folioPreparationConfirmedAt
    || issue.folioReviewConfirmedAt
    || issue.milestone === 'Final Review'
    || issue.milestone === 'Print'
    || issue.milestone === 'Online Publication',
  );

/** Saved arrangement when present; otherwise demo/schedule issues get the default sequence. */
export const getFolioArrangementItemsForDisplay = (issue: Issue): FolioArrangementItem[] => {
  if (issue.folioArrangement?.items.length) {
    return issue.folioArrangement.items;
  }

  if (!hasFolioWorkflowProgress(issue)) {
    return [];
  }

  return buildDefaultFolioArrangementItems(issue);
};
