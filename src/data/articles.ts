import { JOURNALS } from './journals';

export const ARTICLE_TYPES = [
  'Research',
  'Review',
  'Short Communications',
  'Case Studies',
  'Editorials',
] as const;

export type ArticleType = (typeof ARTICLE_TYPES)[number];

export interface Article {
  id: string;
  type: ArticleType;
  title: string;
  author: string;
  pages: number;
  milestone: string;
  milestoneVariant: 'inprogress' | 'paused';
  estimatedPublication: string;
  acceptance: string;
  doi: string;
}

export const PAGE_BUDGET = 200;

export const ANNUAL_PAGE_BUDGET_TOOLTIP = {
  totalIssuesPerYear: 12,
  totalAnnualAllocationPages: 2400,
  pagesUsedTillDatePages: 840,
  remainingForYearPages: 1520,
} as const;

export const ARTICLES_BY_JOURNAL: Record<string, Article[]> = {
  '1': [
    { id: 'JAMA3101', type: 'Review', title: 'Cardiovascular Risk in Diabetic Patients', author: 'James Carter', pages: 12, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '10 Jan 24 11:00', doi: '10.1001/jama.2024.3101' },
    { id: 'JAMA3102', type: 'Research', title: 'Hypertension Management Guidelines Update', author: 'Sarah Lee', pages: 18, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '12 Jan 24 11:00', doi: '10.1001/jama.2024.3102' },
    { id: 'JAMA3103', type: 'Review', title: 'Obesity and Metabolic Syndrome', author: 'David Kim', pages: 24, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '14 Jan 24 11:00', doi: '10.1001/jama.2024.3103' },
    { id: 'JAMA3104', type: 'Research', title: 'Immunotherapy in Cancer Treatment', author: 'Emily Wang', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '15 Jan 24 11:00', doi: '10.1001/jama.2024.3104' },
    { id: 'JAMA3105', type: 'Case Studies', title: 'Rare Autoimmune Disorders in Pediatrics', author: 'Michael Brown', pages: 16, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '16 Jan 24 11:00', doi: '10.1001/jama.2024.3105' },
    { id: 'JAMA3106', type: 'Review', title: 'Mental Health in Post-Pandemic Era', author: 'Anna Chen', pages: 20, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '17 Jan 24 11:00', doi: '10.1001/jama.2024.3106' },
  ],
  '2': [
    { id: 'NEJM4241', type: 'Review', title: 'Machine Learning Applications in Diagnostic Imaging', author: 'Xi Pi Xiang', pages: 10, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMra4241' },
    { id: 'NEJM4242', type: 'Research', title: 'AI in Radiology: Enhancing Image Analysis', author: 'Mohamed Kamran', pages: 20, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4242' },
    { id: 'NEJM4243', type: 'Short Communications', title: 'Deep Learning Techniques for Tumor Detection', author: 'Rihanna John', pages: 40, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4243' },
    { id: 'NEJM42434', type: 'Research', title: 'Automated Segmentation in MRI Scans', author: 'Selena Mariam', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa42434' },
    { id: 'NEJM4245', type: 'Case Studies', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 24, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4245' },
    { id: 'NEJM4246', type: 'Short Communications', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 16, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4246' },
    { id: 'NEJM4247', type: 'Editorials', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 20, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4247' },
    { id: 'NEJM4248', type: 'Research', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 40, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4248' },
    { id: 'NEJM4249', type: 'Review', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 32, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4249' },
  ],
  '3': [
    { id: 'BMJ2201', type: 'Review', title: 'Global Health Disparities in Low-Income Nations', author: 'Priya Nair', pages: 14, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '20 Jan 24 11:00', doi: '10.1136/bmj.2024.2201' },
    { id: 'BMJ2202', type: 'Research', title: 'Antibiotic Resistance: A Growing Concern', author: 'Tom Hughes', pages: 22, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '21 Jan 24 11:00', doi: '10.1136/bmj.2024.2202' },
    { id: 'BMJ2203', type: 'Case Studies', title: 'COVID-19 Long-Term Neurological Effects', author: 'Anita Patel', pages: 18, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '22 Jan 24 11:00', doi: '10.1136/bmj.2024.2203' },
    { id: 'BMJ2204', type: 'Review', title: 'Telemedicine Adoption Post-Pandemic', author: 'Chris Evans', pages: 28, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '23 Jan 24 11:00', doi: '10.1136/bmj.2024.2204' },
  ],
};

JOURNALS.filter(journal => !ARTICLES_BY_JOURNAL[journal.id]).forEach(journal => {
  const prefix = journal.acronym.toLowerCase();
  ARTICLES_BY_JOURNAL[journal.id] = [
    { id: `${journal.acronym}001`, type: 'Review', title: 'Advances in Molecular Biology Research', author: 'Dr. Amanda Foster', pages: 16, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '20 Jan 24 11:00', doi: `10.9999/${prefix}.2024.001` },
    { id: `${journal.acronym}002`, type: 'Research', title: 'Genomic Sequencing in Precision Medicine', author: 'Dr. Robert Chen', pages: 24, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '21 Jan 24 11:00', doi: `10.9999/${prefix}.2024.002` },
    { id: `${journal.acronym}003`, type: 'Review', title: 'Climate Change and Human Health Outcomes', author: 'Dr. Lisa Park', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '22 Jan 24 11:00', doi: `10.9999/${prefix}.2024.003` },
    { id: `${journal.acronym}004`, type: 'Case Studies', title: 'Emerging Viral Pathogens in Urban Populations', author: 'Dr. Mark Williams', pages: 20, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '23 Jan 24 11:00', doi: `10.9999/${prefix}.2024.004` },
    { id: `${journal.acronym}005`, type: 'Short Communications', title: 'Neural Network Approaches to Drug Discovery', author: 'Dr. Sandra Kim', pages: 18, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '24 Jan 24 11:00', doi: `10.9999/${prefix}.2024.005` },
  ];
});

export const MILESTONES = ['All', 'Copyediting', 'Copyediting Review', 'Author Review', 'PE Review', 'Revises', 'PAP'];

export const SORT_OPTIONS = [
  { value: 'acceptance-asc', label: 'Acceptance Date (Earliest First)' },
  { value: 'acceptance-desc', label: 'Acceptance Date (Latest First)' },
  { value: 'publication-asc', label: 'Est. Publication (Earliest First)' },
  { value: 'publication-desc', label: 'Est. Publication (Latest First)' },
];
