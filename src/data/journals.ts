export interface Journal {
  id: string;
  acronym: string;
  fullName: string;
}

export const JOURNALS: Journal[] = [
  { id: '1', acronym: 'JAMA', fullName: 'Journal of the American Medical Association' },
  { id: '2', acronym: 'NEJM', fullName: 'New England Journal of Medicine' },
  { id: '3', acronym: 'BMJ', fullName: 'British Medical Journal' },
  { id: '4', acronym: 'Lancet', fullName: 'The Lancet' },
  { id: '5', acronym: 'Nature', fullName: 'Nature Magazine' },
  { id: '6', acronym: 'Science', fullName: 'Science Magazine' },
  { id: '7', acronym: 'Cell', fullName: 'Cell Journal' },
  { id: '8', acronym: 'PNAS', fullName: 'Proceedings of the National Academy of Sciences' },
  { id: '9', acronym: 'ACS', fullName: 'American Chemical Society Journal' },
  { id: '10', acronym: 'IEEE', fullName: 'Institute of Electrical and Electronics Engineers' },
];

export const getJournalAcronym = (journalId: string): string =>
  JOURNALS.find(j => j.id === journalId)?.acronym ?? '';
