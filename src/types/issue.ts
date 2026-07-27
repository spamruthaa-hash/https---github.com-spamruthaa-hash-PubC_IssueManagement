/**
 * Sequential milestones an issue moves through. The order here is the source of
 * truth for any "is this milestone before/after" logic.
 */
import type { Article } from '../data/articles';

export const ISSUE_MILESTONES = [
  'Article Lineup',
  'Folio Creation',
  'Folio Preparation',
  'Final Review',
  'Print',
  'Online Publication',
] as const;

export type IssueMilestone = (typeof ISSUE_MILESTONES)[number];

export type IssueType = 'regular' | 'special';

export type IssueOutputFormat = 'print' | 'online' | 'both';

export type IssueStatus = 'in-progress' | 'completed';

export type FolioMatterType =
  | 'coversheet'
  | 'masthead'
  | 'table-of-contents'
  | 'call-for-papers'
  | 'advertisement'
  | 'upcoming-issue'
  | 'blank';

export interface FolioFileAttachment {
  name: string;
  size: number;
  type: string;
  pageCount?: number;
  objectUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface FolioMatterPlacement {
  id: string;
  kind: 'matter';
  matterType: FolioMatterType;
  file?: FolioFileAttachment;
  /** Set during folio arrangement when page ranges are recalculated. */
  startPage?: number;
  endPage?: number;
}

export interface FolioArticlePlacement {
  id: string;
  kind: 'article';
  articleId: string;
  startPage: number;
  endPage: number;
}

export type FolioArrangementItem = FolioMatterPlacement | FolioArticlePlacement;

export interface FolioArrangement {
  items: FolioArrangementItem[];
  submittedAt: string;
  submittedBy: string;
}

export type FolioPreparationRevisionReason = 'folio-edit' | 'correction' | 're-review';

export interface FolioPreparationRevision {
  id: string;
  startedAt: string;
  completedAt: string;
  reason: FolioPreparationRevisionReason;
  submittedAt: string;
  submittedBy: string;
}

export interface ArticleLineupRevision {
  id: string;
  startedAt: string;
  completedAt: string;
  submittedAt: string;
  submittedBy: string;
  articleCount: number;
}

export interface FolioCreationRevision {
  id: string;
  startedAt: string;
  completedAt: string;
  submittedAt: string;
  submittedBy: string;
  itemCount: number;
}

export interface Issue {
  id: string;
  journalId: string;
  journalAcronym: string;
  volume: string;
  issue: string;
  issueTitle: string;
  coverMonth: string;
  /** ISO yyyy-mm-dd */
  publicationDate: string;
  /** ISO yyyy-mm-dd */
  issueCloseDate: string;
  issueType: IssueType;
  outputFormat: IssueOutputFormat;
  assignedArticleIds: string[];
  /** Manually added articles kept only for this issue's lineup/folio. */
  externalArticles?: Article[];
  articleLineupStartedAt?: string;
  articleLineupRevisions?: ArticleLineupRevision[];
  articleLineupConfirmedAt?: string;
  articleLineupConfirmedBy?: string;
  folioArrangement?: FolioArrangement;
  /** Ready-made folio supplied at issue creation, skipping lineup and folio creation. */
  folioUpload?: FolioFileAttachment;
  folioCreationRevisions?: FolioCreationRevision[];
  folioArrangementConfirmedAt?: string;
  folioArrangementConfirmedBy?: string;
  folioPreparationStartedAt?: string;
  folioPreparationRevisions?: FolioPreparationRevision[];
  folioPreparationConfirmedAt?: string;
  folioPreparationConfirmedBy?: string;
  folioReviewConfirmedAt?: string;
  folioReviewConfirmedBy?: string;
  printConfirmedAt?: string;
  printConfirmedBy?: string;
  onlinePublicationConfirmedAt?: string;
  onlinePublicationConfirmedBy?: string;
  milestone: IssueMilestone;
  status: IssueStatus;
  createdAt: string;
}
