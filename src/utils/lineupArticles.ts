import { ARTICLES_BY_JOURNAL, type Article, type ArticleType } from '../data/articles';
import { formatDisplayDateTime } from './dateFormat';
import { getMockToday } from './mockToday';

export const getJournalArticlePool = (journalId: string): Article[] =>
  ARTICLES_BY_JOURNAL[journalId] ?? [];

export const getLineupArticlesForJournal = (
  journalId: string,
  externalArticles: Article[] = [],
): Article[] => {
  const pool = getJournalArticlePool(journalId);
  const externalIds = new Set(externalArticles.map(article => article.id));
  return [...externalArticles, ...pool.filter(article => !externalIds.has(article.id))];
};

export const buildArticlesById = (articles: Article[]): Record<string, Article> =>
  articles.reduce<Record<string, Article>>((acc, article) => {
    acc[article.id] = article;
    return acc;
  }, {});

export interface NewExternalArticleInput {
  id: string;
  type?: ArticleType;
  title: string;
  author: string;
  pages?: number;
  doi: string;
  uploadFile?: {
    name: string;
    size: number;
    type: string;
  };
}

export const createExternalArticle = (input: NewExternalArticleInput): Article => {
  const today = formatDisplayDateTime(getMockToday().toISOString());
  return {
    id: input.id.trim(),
    type: input.type ?? 'Research',
    title: input.title.trim(),
    author: input.author.trim(),
    pages: input.pages ?? 1,
    milestone: 'PAP',
    milestoneVariant: 'inprogress',
    estimatedPublication: today,
    acceptance: today,
    doi: input.doi.trim(),
    source: 'external',
    ...(input.uploadFile ? { uploadFile: input.uploadFile } : {}),
  };
};
