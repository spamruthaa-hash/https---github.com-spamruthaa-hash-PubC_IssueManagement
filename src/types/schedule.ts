import type { IssueOutputFormat } from './issue';



export type ScheduleIssueType = 'regular' | 'special';



export type ScheduleMilestoneKind =

  | 'issue-creation'

  | 'article-lineup'

  | 'folio-creation'

  | 'folio-preparation'

  | 'folio-review'

  | 'print-package'

  | 'online-publication';



export interface ScheduleMilestone {

  kind: ScheduleMilestoneKind;

  label: string;

  startDate: string;

  endDate: string;

}



export interface ScheduledIssueEntry {

  id: string;

  journalId: string;

  journalAcronym: string;

  volume: string;

  issue: string;

  issueType: ScheduleIssueType;

  outputFormat: IssueOutputFormat;

  milestones: ScheduleMilestone[];

}



export interface JournalSchedule {

  journalId: string;

  fileName: string;

  fileSize: number;

  uploadedAt: string;

  entries: ScheduledIssueEntry[];

}


