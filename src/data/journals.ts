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
  { id: '11', acronym: 'WSD', fullName: 'World Science Digest' },
  { id: '12', acronym: 'DS', fullName: 'Diagnostic Science' },
  { id: '13', acronym: 'BRH', fullName: 'Biomedical Research Hub' },
  { id: '14', acronym: 'HD', fullName: 'Health Discovery' },
  { id: '15', acronym: 'VCS', fullName: 'Vascular Clinical Studies' },
  { id: '16', acronym: 'OIJ', fullName: 'Open Innovation Journal' },
  { id: '17', acronym: 'CDF', fullName: 'Clinical Data Forum' },
];

export const getJournalAcronym = (journalId: string): string =>
  JOURNALS.find(j => j.id === journalId)?.acronym ?? '';
