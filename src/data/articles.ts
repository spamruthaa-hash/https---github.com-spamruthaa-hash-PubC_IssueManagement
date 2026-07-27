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
  /** Articles added manually for issue management (processed outside the system). */
  source?: 'journal' | 'external';
  uploadFile?: {
    name: string;
    size: number;
    type: string;
  };
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
    { id: 'NEJM4250', type: 'Editorials', title: 'Phase III Oncology Endpoints in 2026', author: 'Dr. Helen Cho', pages: 10, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '08 May 26 11:00', doi: '10.1056/NEJMoa4250' },
  ],
  '3': [
    { id: 'BMJ2201', type: 'Review', title: 'Global Health Disparities in Low-Income Nations', author: 'Priya Nair', pages: 14, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '20 Jan 24 11:00', doi: '10.1136/bmj.2024.2201' },
    { id: 'BMJ2202', type: 'Research', title: 'Antibiotic Resistance: A Growing Concern', author: 'Tom Hughes', pages: 22, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '21 Jan 24 11:00', doi: '10.1136/bmj.2024.2202' },
    { id: 'BMJ2203', type: 'Case Studies', title: 'COVID-19 Long-Term Neurological Effects', author: 'Anita Patel', pages: 18, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '22 Jan 24 11:00', doi: '10.1136/bmj.2024.2203' },
    { id: 'BMJ2204', type: 'Review', title: 'Telemedicine Adoption Post-Pandemic', author: 'Chris Evans', pages: 28, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '23 Jan 24 11:00', doi: '10.1136/bmj.2024.2204' },
    { id: 'BMJ2205', type: 'Short Communications', title: 'Nutrition Interventions in Rural Clinics', author: 'Helen Ortiz', pages: 12, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '24 Jan 24 11:00', doi: '10.1136/bmj.2024.2205' },
    { id: 'BMJ2206', type: 'Editorials', title: 'Ethics of AI-Assisted Diagnosis', author: 'Raj Mehta', pages: 8, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '25 Jan 24 11:00', doi: '10.1136/bmj.2024.2206' },
  ],
  '11': [
    { id: 'WSD4101', type: 'Research', title: 'Quantum Sensors in Environmental Monitoring', author: 'Lena Vogt', pages: 18, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '10 May 26 11:00', doi: '10.1000/wsd.2026.4101' },
    { id: 'WSD4102', type: 'Review', title: 'Synthetic Biology and Public Policy', author: 'Marcus Bell', pages: 24, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '11 May 26 11:00', doi: '10.1000/wsd.2026.4102' },
    { id: 'WSD4103', type: 'Case Studies', title: 'Lab Safety Incidents: Lessons Learned', author: 'Yuki Tanaka', pages: 16, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '12 May 26 11:00', doi: '10.1000/wsd.2026.4103' },
    { id: 'WSD4104', type: 'Short Communications', title: 'Open Data Repositories for Climate Science', author: 'Elena Rossi', pages: 10, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '13 May 26 11:00', doi: '10.1000/wsd.2026.4104' },
    { id: 'WSD4105', type: 'Research', title: 'CRISPR Delivery Mechanisms in Vitro', author: 'Noah Pierce', pages: 28, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '14 May 26 11:00', doi: '10.1000/wsd.2026.4105' },
    { id: 'WSD4106', type: 'Editorials', title: 'Reproducibility Standards in 2026', author: 'Clara Weiss', pages: 6, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '15 May 26 11:00', doi: '10.1000/wsd.2026.4106' },
  ],
  '12': [
    { id: 'DS3301', type: 'Research', title: 'Bayesian Models for Trial Design', author: 'Ian Cooper', pages: 20, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '12 May 26 11:00', doi: '10.1000/ds.2026.3301' },
    { id: 'DS3302', type: 'Review', title: 'Real-World Evidence in Regulatory Submissions', author: 'Maya Johnson', pages: 26, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '13 May 26 11:00', doi: '10.1000/ds.2026.3302' },
    { id: 'DS3303', type: 'Case Studies', title: 'Missing Data Imputation in Cohort Studies', author: 'Omar Hassan', pages: 14, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '14 May 26 11:00', doi: '10.1000/ds.2026.3303' },
    { id: 'DS3304', type: 'Research', title: 'Federated Learning for Hospital Networks', author: 'Grace Lin', pages: 22, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '21 May 26 11:00', acceptance: '15 May 26 11:00', doi: '10.1000/ds.2026.3304' },
    { id: 'DS3305', type: 'Short Communications', title: 'Visualizing Survival Curves at Scale', author: 'Peter Walsh', pages: 12, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '16 May 26 11:00', doi: '10.1000/ds.2026.3305' },
  ],
  '13': [
    { id: 'BRH5101', type: 'Review', title: 'Stem Cell Therapies in Orthopedics', author: 'Dr. Nina Kovač', pages: 18, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '28 May 26 11:00', acceptance: '18 May 26 11:00', doi: '10.1000/brh.2026.5101' },
    { id: 'BRH5102', type: 'Research', title: 'Biomarkers for Early Alzheimer Detection', author: 'Dr. Felix Grant', pages: 30, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '28 May 26 11:00', acceptance: '19 May 26 11:00', doi: '10.1000/brh.2026.5102' },
    { id: 'BRH5103', type: 'Case Studies', title: 'Rare Lysosomal Storage Disorders', author: 'Dr. Sofia Martins', pages: 16, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '28 May 26 11:00', acceptance: '20 May 26 11:00', doi: '10.1000/brh.2026.5103' },
    { id: 'BRH5104', type: 'Research', title: 'Gene Therapy Trial Outcomes Meta-Analysis', author: 'Dr. Adam Reed', pages: 24, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '28 May 26 11:00', acceptance: '21 May 26 11:00', doi: '10.1000/brh.2026.5104' },
    { id: 'BRH5105', type: 'Editorials', title: 'Equity in Clinical Trial Enrollment', author: 'Dr. Amara Okafor', pages: 8, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '28 May 26 11:00', acceptance: '22 May 26 11:00', doi: '10.1000/brh.2026.5105' },
  ],
  '14': [
    { id: 'HD6201', type: 'Research', title: 'Wearables and Continuous Glucose Monitoring', author: 'Jessica Tran', pages: 20, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '01 Jun 26 11:00', acceptance: '20 May 26 11:00', doi: '10.1000/hd.2026.6201' },
    { id: 'HD6202', type: 'Review', title: 'Gut Microbiome and Autoimmune Disease', author: 'Kevin Brooks', pages: 28, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '01 Jun 26 11:00', acceptance: '21 May 26 11:00', doi: '10.1000/hd.2026.6202' },
    { id: 'HD6203', type: 'Case Studies', title: 'Pediatric Asthma Management Pathways', author: 'Laura Schmidt', pages: 14, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '01 Jun 26 11:00', acceptance: '22 May 26 11:00', doi: '10.1000/hd.2026.6203' },
    { id: 'HD6204', type: 'Short Communications', title: 'Digital Therapeutics for Hypertension', author: 'Ryan Park', pages: 11, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '01 Jun 26 11:00', acceptance: '23 May 26 11:00', doi: '10.1000/hd.2026.6204' },
    { id: 'HD6205', type: 'Research', title: 'Sleep Apnea and Cardiovascular Risk', author: 'Diana Cole', pages: 22, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '01 Jun 26 11:00', acceptance: '24 May 26 11:00', doi: '10.1000/hd.2026.6205' },
  ],
  '15': [
    { id: 'VCS7101', type: 'Research', title: 'Novel Anticoagulants in Atrial Fibrillation', author: 'Dr. Victor Hale', pages: 24, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '19 May 26 11:00', doi: '10.1000/vcs.2026.7101' },
    { id: 'VCS7102', type: 'Review', title: 'Endovascular Repair Long-Term Outcomes', author: 'Dr. Irene Marsh', pages: 26, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '20 May 26 11:00', doi: '10.1000/vcs.2026.7102' },
    { id: 'VCS7103', type: 'Case Studies', title: 'Acute Limb Ischemia Case Series', author: 'Dr. Paul Stein', pages: 16, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '21 May 26 11:00', doi: '10.1000/vcs.2026.7103' },
    { id: 'VCS7104', type: 'Research', title: 'Hypertension in Pregnancy: Cohort Study', author: 'Dr. Leah Fong', pages: 20, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '21 May 26 11:00', doi: '10.1000/vcs.2026.7104' },
  ],
  '16': [
    { id: 'OIJ8101', type: 'Research', title: 'Open Peer Review and Citation Impact', author: 'Taylor Reed', pages: 18, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '05 Jun 26 11:00', acceptance: '22 May 26 11:00', doi: '10.1000/oij.2026.8101' },
    { id: 'OIJ8102', type: 'Review', title: 'Preprint Servers and Journal Workflows', author: 'Jordan Blake', pages: 22, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '05 Jun 26 11:00', acceptance: '23 May 26 11:00', doi: '10.1000/oij.2026.8102' },
    { id: 'OIJ8103', type: 'Editorials', title: 'Sustainable Publishing Operations', author: 'Casey Morgan', pages: 8, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '05 Jun 26 11:00', acceptance: '24 May 26 11:00', doi: '10.1000/oij.2026.8103' },
    { id: 'OIJ8104', type: 'Case Studies', title: 'Cross-Journal Data Sharing Agreements', author: 'Sam Rivera', pages: 14, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '05 Jun 26 11:00', acceptance: '25 May 26 11:00', doi: '10.1000/oij.2026.8104' },
  ],
  '17': [
    { id: 'CDF9101', type: 'Research', title: 'Clinical Data Standards for Multi-Site Trials', author: 'Nora Patel', pages: 22, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '15 May 26 11:00', doi: '10.1000/cdf.2026.9101' },
    { id: 'CDF9102', type: 'Review', title: 'FHIR Interoperability in Hospital EMRs', author: 'Luke Brennan', pages: 26, milestone: 'Copyediting', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '16 May 26 11:00', doi: '10.1000/cdf.2026.9102' },
    { id: 'CDF9103', type: 'Case Studies', title: 'Anonymization Pipelines for Registry Data', author: 'Mia Torres', pages: 16, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '17 May 26 11:00', doi: '10.1000/cdf.2026.9103' },
    { id: 'CDF9104', type: 'Short Communications', title: 'Audit Trails for Regulatory Inspections', author: 'Ethan Moore', pages: 12, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '18 May 26 11:00', doi: '10.1000/cdf.2026.9104' },
    { id: 'CDF9105', type: 'Research', title: 'Machine-Readable Protocol Registrations', author: 'Zoe Carter', pages: 20, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '21 May 26 11:00', acceptance: '19 May 26 11:00', doi: '10.1000/cdf.2026.9105' },
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
