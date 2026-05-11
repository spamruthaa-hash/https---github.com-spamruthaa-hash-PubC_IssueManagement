/**
 * Sequential milestones an issue moves through. The order here is the source of
 * truth for any "is this milestone before/after" logic.
 */
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
  articleLineupConfirmedAt?: string;
  articleLineupConfirmedBy?: string;
  milestone: IssueMilestone;
  status: IssueStatus;
  createdAt: string;
}
