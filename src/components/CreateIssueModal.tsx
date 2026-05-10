import { useState, useRef, useEffect, FormEvent } from 'react';
import './CreateIssueModal.css';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (issueData: IssueFormData) => void;
}

export interface IssueFormData {
  journal: string;
  volume: string;
  issue: string;
  issueTitle: string;
  coverMonth: string;
  publicationDate: string;
  issueCloseDate: string;
  issueType: 'regular' | 'special' | '';
  outputFormat: 'print' | 'online' | 'both' | '';
  selectedArticles?: Article[];
}

interface Journal {
  id: string;
  acronym: string;
  fullName: string;
}

interface Article {
  id: string;
  type: string;
  title: string;
  author: string;
  pages: number;
  milestone: string;
  milestoneVariant: 'inprogress' | 'paused';
  estimatedPublication: string;
  acceptance: string;
  doi: string;
}

const PRELOADED_JOURNALS: Journal[] = [
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAGE_BUDGET = 200;

/** Copy for Page Budget info tooltip (annual allocation summary) */
const ANNUAL_PAGE_BUDGET_TOOLTIP = {
  totalIssuesPerYear: 12,
  totalAnnualAllocationPages: 2400,
  pagesUsedTillDatePages: 840,
  remainingForYearPages: 1520,
} as const;

const ARTICLES_BY_JOURNAL: Record<string, Article[]> = {
  '1': [ // JAMA
    { id: 'JAMA3101', type: 'Review', title: 'Cardiovascular Risk in Diabetic Patients', author: 'James Carter', pages: 12, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '10 Jan 24 11:00', doi: '10.1001/jama.2024.3101' },
    { id: 'JAMA3102', type: 'Research', title: 'Hypertension Management Guidelines Update', author: 'Sarah Lee', pages: 18, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '12 Jan 24 11:00', doi: '10.1001/jama.2024.3102' },
    { id: 'JAMA3103', type: 'Review', title: 'Obesity and Metabolic Syndrome', author: 'David Kim', pages: 24, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '14 Jan 24 11:00', doi: '10.1001/jama.2024.3103' },
    { id: 'JAMA3104', type: 'Research', title: 'Immunotherapy in Cancer Treatment', author: 'Emily Wang', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '15 Jan 24 11:00', doi: '10.1001/jama.2024.3104' },
    { id: 'JAMA3105', type: 'Case Study', title: 'Rare Autoimmune Disorders in Pediatrics', author: 'Michael Brown', pages: 16, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '16 Jan 24 11:00', doi: '10.1001/jama.2024.3105' },
    { id: 'JAMA3106', type: 'Review', title: 'Mental Health in Post-Pandemic Era', author: 'Anna Chen', pages: 20, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '17 Jan 24 11:00', doi: '10.1001/jama.2024.3106' },
  ],
  '2': [ // NEJM
    { id: 'NEJM4241', type: 'Review', title: 'Machine Learning Applications in Diagnostic Imaging', author: 'Xi Pi Xiang', pages: 10, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMra4241' },
    { id: 'NEJM4242', type: 'Research', title: 'AI in Radiology: Enhancing Image Analysis', author: 'Mohamed Kamran', pages: 20, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4242' },
    { id: 'NEJM4243', type: '26/2', title: 'Deep Learning Techniques for Tumor Detection', author: 'Rihanna John', pages: 40, milestone: 'PE Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4243' },
    { id: 'NEJM42434', type: '24/2', title: 'Automated Segmentation in MRI Scans', author: 'Selena Mariam', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa42434' },
    { id: 'NEJM4245', type: '6/1', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 24, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4245' },
    { id: 'NEJM4246', type: '26/2', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 16, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4246' },
    { id: 'NEJM4247', type: '26/2', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 20, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4247' },
    { id: 'NEJM4248', type: '16/2', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 40, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4248' },
    { id: 'NEJM4249', type: '24/2', title: 'Predictive Analytics for Patient Outcomes', author: 'Mika Singh', pages: 32, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '26 Jan 24 11:00', doi: '10.1056/NEJMoa4249' },
  ],
  '3': [ // BMJ
    { id: 'BMJ2201', type: 'Review', title: 'Global Health Disparities in Low-Income Nations', author: 'Priya Nair', pages: 14, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '20 Jan 24 11:00', doi: '10.1136/bmj.2024.2201' },
    { id: 'BMJ2202', type: 'Research', title: 'Antibiotic Resistance: A Growing Concern', author: 'Tom Hughes', pages: 22, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '21 Jan 24 11:00', doi: '10.1136/bmj.2024.2202' },
    { id: 'BMJ2203', type: 'Case Study', title: 'COVID-19 Long-Term Neurological Effects', author: 'Anita Patel', pages: 18, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '22 Jan 24 11:00', doi: '10.1136/bmj.2024.2203' },
    { id: 'BMJ2204', type: 'Review', title: 'Telemedicine Adoption Post-Pandemic', author: 'Chris Evans', pages: 28, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '23 Jan 24 11:00', doi: '10.1136/bmj.2024.2204' },
  ],
};

// Generate generic articles for other journals
['4', '5', '6', '7', '8', '9', '10'].forEach(id => {
  const journal = PRELOADED_JOURNALS.find(j => j.id === id);
  if (!journal) return;
  const prefix = journal.acronym.toLowerCase();
  ARTICLES_BY_JOURNAL[id] = [
    { id: `${journal.acronym}001`, type: 'Review', title: 'Advances in Molecular Biology Research', author: 'Dr. Amanda Foster', pages: 16, milestone: 'Author Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '20 Jan 24 11:00', doi: `10.9999/${prefix}.2024.001` },
    { id: `${journal.acronym}002`, type: 'Research', title: 'Genomic Sequencing in Precision Medicine', author: 'Dr. Robert Chen', pages: 24, milestone: 'Copyediting Review', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '21 Jan 24 11:00', doi: `10.9999/${prefix}.2024.002` },
    { id: `${journal.acronym}003`, type: 'Review', title: 'Climate Change and Human Health Outcomes', author: 'Dr. Lisa Park', pages: 32, milestone: 'Revises', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '22 Jan 24 11:00', doi: `10.9999/${prefix}.2024.003` },
    { id: `${journal.acronym}004`, type: 'Case Study', title: 'Emerging Viral Pathogens in Urban Populations', author: 'Dr. Mark Williams', pages: 20, milestone: 'PE Review', milestoneVariant: 'paused', estimatedPublication: '26 Jan 24 11:00', acceptance: '23 Jan 24 11:00', doi: `10.9999/${prefix}.2024.004` },
    { id: `${journal.acronym}005`, type: 'Research', title: 'Neural Network Approaches to Drug Discovery', author: 'Dr. Sandra Kim', pages: 18, milestone: 'PAP', milestoneVariant: 'inprogress', estimatedPublication: '26 Jan 24 11:00', acceptance: '24 Jan 24 11:00', doi: `10.9999/${prefix}.2024.005` },
  ];
});

const MILESTONES = ['All', 'Author Review', 'Copyediting Review', 'PE Review', 'Revises', 'PAP'];
const SORT_OPTIONS = [
  { value: 'acceptance-asc', label: 'Acceptance Date (Earliest First)' },
  { value: 'acceptance-desc', label: 'Acceptance Date (Latest First)' },
  { value: 'publication-asc', label: 'Est. Publication (Earliest First)' },
  { value: 'publication-desc', label: 'Est. Publication (Latest First)' },
];

const CreateIssueModal = ({ isOpen, onClose, onSubmit }: CreateIssueModalProps) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<IssueFormData>({
    journal: '', volume: '', issue: '', issueTitle: '',
    coverMonth: '', publicationDate: '', issueCloseDate: '',
    issueType: '', outputFormat: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof IssueFormData, string>>>({});
  const [journalSearchTerm, setJournalSearchTerm] = useState('');
  const [showJournalDropdown, setShowJournalDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Step 2 state
  const [articleSearch, setArticleSearch] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState('All');
  const [sortBy, setSortBy] = useState('acceptance-asc');
  const [showMilestoneDropdown, setShowMilestoneDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [addedArticleIds, setAddedArticleIds] = useState<Set<string>>(new Set());

  const journalDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const milestoneDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const filteredJournals = PRELOADED_JOURNALS.filter(journal =>
    journal.acronym.toLowerCase().includes(journalSearchTerm.toLowerCase()) ||
    journal.fullName.toLowerCase().includes(journalSearchTerm.toLowerCase())
  );

  const availableArticles = ARTICLES_BY_JOURNAL[formData.journal] || [];

  const filteredAndSortedArticles = availableArticles
    .filter(a => {
      const matchesSearch = articleSearch === '' ||
        a.id.toLowerCase().includes(articleSearch.toLowerCase()) ||
        a.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
        a.author.toLowerCase().includes(articleSearch.toLowerCase());
      const matchesMilestone = milestoneFilter === 'All' || a.milestone === milestoneFilter;
      return matchesSearch && matchesMilestone;
    })
    .sort((a, b) => {
      // All dates are the same in mock data, but sort logic is wired up
      if (sortBy === 'acceptance-asc') return a.id.localeCompare(b.id);
      if (sortBy === 'acceptance-desc') return b.id.localeCompare(a.id);
      return 0;
    });

  const addedArticles = availableArticles.filter(a => addedArticleIds.has(a.id));
  const pagesAdded = addedArticles.reduce((sum, a) => sum + a.pages, 0);
  const pagesRemaining = PAGE_BUDGET - pagesAdded;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (journalDropdownRef.current && !journalDropdownRef.current.contains(event.target as Node)) {
        setShowJournalDropdown(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false);
      }
      if (milestoneDropdownRef.current && !milestoneDropdownRef.current.contains(event.target as Node)) {
        setShowMilestoneDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleInputChange = (field: keyof IssueFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumericInput = (field: 'volume' | 'issue', value: string) => {
    if (value === '' || /^\d+$/.test(value)) handleInputChange(field, value);
  };

  const handleJournalSelect = (journal: Journal) => {
    setFormData(prev => ({ ...prev, journal: journal.id }));
    setJournalSearchTerm(journal.acronym);
    setShowJournalDropdown(false);
    if (errors.journal) setErrors(prev => ({ ...prev, journal: '' }));
  };

  const handleMonthSelect = (month: string) => {
    handleInputChange('coverMonth', month);
    setShowMonthDropdown(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IssueFormData, string>> = {};
    if (!formData.journal) newErrors.journal = 'Journal is required';
    if (!formData.volume) newErrors.volume = 'Volume is required';
    if (!formData.issue) newErrors.issue = 'Issue is required';
    if (!formData.coverMonth) newErrors.coverMonth = 'Cover Month is required';
    if (!formData.publicationDate) newErrors.publicationDate = 'Publication Date is required';
    if (!formData.issueCloseDate) newErrors.issueCloseDate = 'Issue Close Date is required';
    if (!formData.issueType) newErrors.issueType = 'Issue Type is required';
    if (!formData.outputFormat) newErrors.outputFormat = 'Output Format is required';
    if (formData.publicationDate && formData.issueCloseDate) {
      const pubDate = new Date(formData.publicationDate);
      const closeDate = new Date(formData.issueCloseDate);
      if (closeDate >= pubDate) {
        newErrors.issueCloseDate = 'Issue Close Date must be before Publication Date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) setCurrentStep(2);
  };

  const handleProceed = () => {
    onSubmit({ ...formData, selectedArticles: addedArticles });
      handleClose();
  };

  const handleClose = () => {
    setFormData({ journal: '', volume: '', issue: '', issueTitle: '', coverMonth: '', publicationDate: '', issueCloseDate: '', issueType: '', outputFormat: '' });
    setErrors({});
    setJournalSearchTerm('');
    setCurrentStep(1);
    setAddedArticleIds(new Set());
    setArticleSearch('');
    setMilestoneFilter('All');
    setSortBy('acceptance-asc');
    onClose();
  };

  const toggleArticle = (articleId: string) => {
    setAddedArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const isFormComplete =
    formData.journal && formData.volume && formData.issue &&
    formData.coverMonth && formData.publicationDate && formData.issueCloseDate &&
    formData.issueType && formData.outputFormat;

  const renderStepper = () => (
    <div className="modal-stepper">
      {/* Step 1 */}
      <div className="stepper-item stepper-active">
        <div className="stepper-icon">
          {currentStep === 1 ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="white" stroke="#1C40CA" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#1C40CA"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#1C40CA" stroke="#1C40CA" strokeWidth="2"/>
              <path d="M7.5 12L10.5 15L16.5 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="stepper-label stepper-label-active">Issue Details</span>
      </div>
      <div className="stepper-line"></div>
      {/* Step 2 */}
      <div className={`stepper-item ${currentStep === 2 ? 'stepper-active' : 'stepper-disabled'}`}>
        <div className="stepper-icon">
          {currentStep === 2 ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="white" stroke="#1C40CA" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#1C40CA"/>
            </svg>
          ) : (
            <div className="stepper-icon stepper-icon-pending">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10.5" fill="#E3E4E5" stroke="white" strokeWidth="3"/>
              </svg>
            </div>
          )}
        </div>
        <div className="stepper-label-wrapper">
          <span className="stepper-label stepper-label-active">Article Lineup</span>
          <span className="stepper-optional">Optional</span>
        </div>
      </div>
      <div className="stepper-line"></div>
      {/* Step 3 */}
      <div className="stepper-item stepper-disabled">
        <div className="stepper-icon stepper-icon-pending">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10.5" fill="#E3E4E5" stroke="white" strokeWidth="3"/>
          </svg>
        </div>
        <span className="stepper-label">Review</span>
      </div>
    </div>
  );

  const getMilestoneBadgeClass = (variant: 'inprogress' | 'paused') =>
    variant === 'paused' ? 'milestone-badge milestone-badge-paused' : 'milestone-badge milestone-badge-inprogress';

  const highlight = (text: string, query: string) => {
    if (!query.trim()) return <>{text}</>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part)
            ? <mark key={i} className="search-highlight">{part}</mark>
            : part
        )}
      </>
    );
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Issue</h2>
          <button className="modal-close-button" onClick={handleClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#5D6871"/>
            </svg>
          </button>
        </div>

        {/* ── STEP 1 ── */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep} className="modal-form">
          <div className="form-content">
              {renderStepper()}

              {/* Journal */}
            <div className="form-field">
                <label className="form-label">Journal <span className="required">*</span></label>
              <div className="dropdown-wrapper" ref={journalDropdownRef}>
                <div className={`form-input dropdown-input ${errors.journal ? 'input-error' : ''}`}>
                  <input
                    type="text"
                    placeholder="Select Journal"
                    value={journalSearchTerm}
                      onChange={(e) => { setJournalSearchTerm(e.target.value); setShowJournalDropdown(true); }}
                    onFocus={() => setShowJournalDropdown(true)}
                  />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="dropdown-icon">
                    <path d="M7 10L12 15L17 10H7Z" fill="#5D6871"/>
                  </svg>
                </div>
                {showJournalDropdown && (
                  <div className="dropdown-menu">
                      {filteredJournals.length > 0 ? filteredJournals.map(journal => (
                        <div key={journal.id} className="dropdown-item" onClick={() => handleJournalSelect(journal)}>
                          {journal.acronym}
                        </div>
                      )) : <div className="dropdown-no-results">No journals found</div>}
                  </div>
                )}
              </div>
              {errors.journal && <span className="error-message">{errors.journal}</span>}
            </div>

              {/* Volume & Issue */}
            <div className="form-row">
              <div className="form-field">
                  <label className="form-label">Volume <span className="required">*</span></label>
                  <input type="text" className={`form-input ${errors.volume ? 'input-error' : ''}`} placeholder="Enter Volume" value={formData.volume} onChange={(e) => handleNumericInput('volume', e.target.value)} />
                {errors.volume && <span className="error-message">{errors.volume}</span>}
              </div>
              <div className="form-field">
                  <label className="form-label">Issue <span className="required">*</span></label>
                  <input type="text" className={`form-input ${errors.issue ? 'input-error' : ''}`} placeholder="Enter Issue" value={formData.issue} onChange={(e) => handleNumericInput('issue', e.target.value)} />
                {errors.issue && <span className="error-message">{errors.issue}</span>}
              </div>
            </div>

            {/* Issue Title */}
            <div className="form-field">
              <label className="form-label">Issue Title</label>
                <input type="text" className="form-input" placeholder="Enter Title" value={formData.issueTitle} onChange={(e) => handleInputChange('issueTitle', e.target.value)} />
            </div>

            {/* Cover Month */}
            <div className="form-field">
                <label className="form-label">Cover Month <span className="required">*</span></label>
              <div className="dropdown-wrapper" ref={monthDropdownRef}>
                  <div className={`form-input dropdown-input ${errors.coverMonth ? 'input-error' : ''}`} onClick={() => setShowMonthDropdown(!showMonthDropdown)}>
                    <span className={formData.coverMonth ? '' : 'placeholder'}>{formData.coverMonth || 'Select Cover Month'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="dropdown-icon">
                    <path d="M7 10L12 15L17 10H7Z" fill="#5D6871"/>
                  </svg>
                </div>
                {showMonthDropdown && (
                  <div className="dropdown-menu">
                    {MONTHS.map(month => (
                        <div key={month} className="dropdown-item" onClick={() => handleMonthSelect(month)}>{month}</div>
                    ))}
                  </div>
                )}
              </div>
              {errors.coverMonth && <span className="error-message">{errors.coverMonth}</span>}
            </div>

              {/* Dates */}
            <div className="form-row">
              <div className="form-field">
                  <label className="form-label">Publication Date <span className="required">*</span></label>
                <div className="date-input-wrapper">
                    <input type="date" className={`form-input date-input ${errors.publicationDate ? 'input-error' : ''}`} value={formData.publicationDate} onChange={(e) => handleInputChange('publicationDate', e.target.value)} />
                </div>
                {errors.publicationDate && <span className="error-message">{errors.publicationDate}</span>}
              </div>
              <div className="form-field">
                  <label className="form-label">Issue Close Date <span className="required">*</span></label>
                <div className="date-input-wrapper">
                    <input type="date" className={`form-input date-input ${errors.issueCloseDate ? 'input-error' : ''}`} value={formData.issueCloseDate} onChange={(e) => handleInputChange('issueCloseDate', e.target.value)} />
                </div>
                {errors.issueCloseDate && <span className="error-message">{errors.issueCloseDate}</span>}
              </div>
            </div>

            {/* Issue Type */}
            <div className="form-field">
                <label className="form-label">Issue Type <span className="required">*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                    <input type="radio" name="issueType" value="regular" checked={formData.issueType === 'regular'} onChange={(e) => handleInputChange('issueType', e.target.value)} />
                  <span className="radio-custom"></span>
                  <span className="radio-text">Regular</span>
                </label>
                <label className="radio-label">
                    <input type="radio" name="issueType" value="special" checked={formData.issueType === 'special'} onChange={(e) => handleInputChange('issueType', e.target.value)} />
                  <span className="radio-custom"></span>
                  <span className="radio-text">Special</span>
                </label>
              </div>
              {errors.issueType && <span className="error-message">{errors.issueType}</span>}
            </div>

            {/* Output Format */}
            <div className="form-field">
                <label className="form-label">Output Format <span className="required">*</span></label>
              <div className="radio-group">
                  {(['print', 'online', 'both'] as const).map(val => (
                    <label key={val} className="radio-label">
                      <input type="radio" name="outputFormat" value={val} checked={formData.outputFormat === val} onChange={(e) => handleInputChange('outputFormat', e.target.value)} />
                  <span className="radio-custom"></span>
                      <span className="radio-text">{val.charAt(0).toUpperCase() + val.slice(1)}</span>
                </label>
                  ))}
              </div>
              {errors.outputFormat && <span className="error-message">{errors.outputFormat}</span>}
            </div>
          </div>

          <div className="modal-footer">
              <button type="submit" className="submit-button" disabled={!isFormComplete}>Next</button>
            </div>
          </form>
        )}

        {/* ── STEP 2 ── */}
        {currentStep === 2 && (
          <div className="modal-form">
            <div className="form-content lineup-content">
              {renderStepper()}

              {/* Search + Filters */}
              <div className="lineup-toolbar">
                <div className="lineup-search form-input">
                  <input
                    type="text"
                    placeholder="Search"
                    value={articleSearch}
                    onChange={(e) => setArticleSearch(e.target.value)}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#868E94"/>
                  </svg>
                </div>

                <div className="lineup-filters">
                  {/* Milestone Filter */}
                  <div className="filter-dropdown" ref={milestoneDropdownRef}>
                    <button className="filter-btn" onClick={() => setShowMilestoneDropdown(!showMilestoneDropdown)}>
                      <span className="filter-label">Milestone:</span>
                      <span className="filter-value">{milestoneFilter}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 10L12 15L17 10H7Z" fill="#35424D"/>
                      </svg>
                    </button>
                    {showMilestoneDropdown && (
                      <div className="filter-dropdown-menu">
                        {MILESTONES.map(m => {
                          const isSelected = milestoneFilter === m;
                          return (
                            <div key={m} className="filter-dropdown-item" onClick={() => { setMilestoneFilter(m); setShowMilestoneDropdown(false); }}>
                              <span className="filter-dropdown-item-check">
                                {isSelected && (
                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 10.5L9.5 12.5L13 9" stroke="#35424D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </span>
                              <span className="filter-dropdown-item-label">{m}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sort Filter */}
                  <div className="filter-dropdown" ref={sortDropdownRef}>
                    <button className="filter-btn" onClick={() => setShowSortDropdown(!showSortDropdown)}>
                      <span className="filter-label">Sort by:</span>
                      <span className="filter-value">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 10L12 15L17 10H7Z" fill="#35424D"/>
                      </svg>
                    </button>
                    {showSortDropdown && (
                      <div className="filter-dropdown-menu filter-dropdown-menu-right">
                        {SORT_OPTIONS.map(o => {
                          const isSelected = sortBy === o.value;
                          return (
                            <div key={o.value} className="filter-dropdown-item" onClick={() => { setSortBy(o.value); setShowSortDropdown(false); }}>
                              <span className="filter-dropdown-item-check">
                                {isSelected && (
                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 10.5L9.5 12.5L13 9" stroke="#35424D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </span>
                              <span className="filter-dropdown-item-label">{o.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Available Articles count */}
              <div className="lineup-section-title">
                Available Articles ({filteredAndSortedArticles.length})
              </div>

              {/* Articles Table */}
              <div className="articles-table-wrapper">
                <table className="articles-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Type</th>
                      <th>Content</th>
                      <th>Pages</th>
                      <th>Milestone</th>
                      <th>Estimated Publication</th>
                      <th>Acceptance</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedArticles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="articles-empty">No articles found</td>
                      </tr>
                    ) : filteredAndSortedArticles.map(article => {
                      const isAdded = addedArticleIds.has(article.id);
                      return (
                        <tr key={article.id} className={isAdded ? 'article-row-added' : ''}>
                          <td>
                            <span className="article-id">{highlight(article.id, articleSearch)}</span>
                          </td>
                          <td className="article-type">{article.type}</td>
                          <td className="article-content">
                            <div className="article-title-row">
                              <span className="article-title">{highlight(article.title, articleSearch)}</span>
                              <span className="doi-tooltip-wrapper">
                              <button className="doi-icon-btn" aria-label="View DOI">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <mask id="mask0_299_74458" style={{maskType:'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                                    <rect width="16" height="16" fill="#D9D9D9"/>
                                  </mask>
                                  <g mask="url(#mask0_299_74458)">
                                    <path d="M5.41659 14.1417C4.60547 13.7917 3.89714 13.3139 3.29159 12.7083C2.68603 12.1028 2.20825 11.3945 1.85825 10.5833C1.50825 9.77223 1.33325 8.90834 1.33325 7.99168C1.33325 7.07501 1.50825 6.2139 1.85825 5.40834C2.20825 4.60279 2.68603 3.89723 3.29159 3.29168C3.89714 2.68612 4.60547 2.20834 5.41659 1.85834C6.2277 1.50834 7.09158 1.33334 8.00825 1.33334C8.92492 1.33334 9.78603 1.50834 10.5916 1.85834C11.3971 2.20834 12.1027 2.68612 12.7083 3.29168C13.3138 3.89723 13.7916 4.60279 14.1416 5.40834C14.4916 6.2139 14.6666 7.07501 14.6666 7.99168C14.6666 8.90834 14.4916 9.77223 14.1416 10.5833C13.7916 11.3945 13.3138 12.1028 12.7083 12.7083C12.1027 13.3139 11.3971 13.7917 10.5916 14.1417C9.78603 14.4917 8.92492 14.6667 8.00825 14.6667C7.09158 14.6667 6.2277 14.4917 5.41659 14.1417ZM7.99992 13.3C8.28881 12.9 8.53881 12.4833 8.74992 12.05C8.96103 11.6167 9.13325 11.1556 9.26659 10.6667H6.73325C6.86659 11.1556 7.03881 11.6167 7.24992 12.05C7.46103 12.4833 7.71103 12.9 7.99992 13.3ZM6.26659 13.0333C6.06659 12.6667 5.89159 12.2861 5.74159 11.8917C5.59159 11.4972 5.46659 11.0889 5.36659 10.6667H3.39992C3.72214 11.2222 4.12492 11.7056 4.60825 12.1167C5.09159 12.5278 5.64436 12.8333 6.26659 13.0333ZM9.73325 13.0333C10.3555 12.8333 10.9083 12.5278 11.3916 12.1167C11.8749 11.7056 12.2777 11.2222 12.5999 10.6667H10.6333C10.5333 11.0889 10.4083 11.4972 10.2583 11.8917C10.1083 12.2861 9.93325 12.6667 9.73325 13.0333ZM2.83325 9.33334H5.09992C5.06659 9.11112 5.04159 8.89168 5.02492 8.67501C5.00825 8.45834 4.99992 8.23334 4.99992 8.00001C4.99992 7.76668 5.00825 7.54168 5.02492 7.32501C5.04159 7.10834 5.06659 6.8889 5.09992 6.66668H2.83325C2.7777 6.8889 2.73603 7.10834 2.70825 7.32501C2.68047 7.54168 2.66659 7.76668 2.66659 8.00001C2.66659 8.23334 2.68047 8.45834 2.70825 8.67501C2.73603 8.89168 2.7777 9.11112 2.83325 9.33334ZM6.43325 9.33334H9.56659C9.59992 9.11112 9.62492 8.89168 9.64159 8.67501C9.65825 8.45834 9.66658 8.23334 9.66658 8.00001C9.66658 7.76668 9.65825 7.54168 9.64159 7.32501C9.62492 7.10834 9.59992 6.8889 9.56659 6.66668H6.43325C6.39992 6.8889 6.37492 7.10834 6.35825 7.32501C6.34158 7.54168 6.33325 7.76668 6.33325 8.00001C6.33325 8.23334 6.34158 8.45834 6.35825 8.67501C6.37492 8.89168 6.39992 9.11112 6.43325 9.33334ZM10.8999 9.33334H13.1666C13.2221 9.11112 13.2638 8.89168 13.2916 8.67501C13.3194 8.45834 13.3333 8.23334 13.3333 8.00001C13.3333 7.76668 13.3194 7.54168 13.2916 7.32501C13.2638 7.10834 13.2221 6.8889 13.1666 6.66668H10.8999C10.9333 6.8889 10.9583 7.10834 10.9749 7.32501C10.9916 7.54168 10.9999 7.76668 10.9999 8.00001C10.9999 8.23334 10.9916 8.45834 10.9749 8.67501C10.9583 8.89168 10.9333 9.11112 10.8999 9.33334ZM10.6333 5.33334H12.5999C12.2777 4.77779 11.8749 4.29445 11.3916 3.88334C10.9083 3.47223 10.3555 3.16668 9.73325 2.96668C9.93325 3.33334 10.1083 3.7139 10.2583 4.10834C10.4083 4.50279 10.5333 4.91112 10.6333 5.33334ZM6.73325 5.33334H9.26659C9.13325 4.84445 8.96103 4.38334 8.74992 3.95001C8.53881 3.51668 8.28881 3.10001 7.99992 2.70001C7.71103 3.10001 7.46103 3.51668 7.24992 3.95001C7.03881 4.38334 6.86659 4.84445 6.73325 5.33334ZM3.39992 5.33334H5.36659C5.46659 4.91112 5.59159 4.50279 5.74159 4.10834C5.89159 3.7139 6.06659 3.33334 6.26659 2.96668C5.64436 3.16668 5.09159 3.47223 4.60825 3.88334C4.12492 4.29445 3.72214 4.77779 3.39992 5.33334Z" fill="#35424D"/>
                                  </g>
                                </svg>
                              </button>
                              <span className="doi-tooltip">
                                <span className="doi-tooltip-label">DOI</span>
                                <span className="doi-tooltip-value">{article.doi}</span>
                              </span>
                              </span>
                            </div>
                            <span className="article-author">{highlight(article.author, articleSearch)}</span>
                          </td>
                          <td className="article-pages">{article.pages}</td>
                          <td>
                            <span className={getMilestoneBadgeClass(article.milestoneVariant)}>
                              {article.milestoneVariant === 'paused' ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>
                                </svg>
                              )}
                              {article.milestone}
                            </span>
                          </td>
                          <td className="article-date">{article.estimatedPublication}</td>
                          <td className="article-date">{article.acceptance}</td>
                          <td className="article-action-cell">
                            <button
                              className={isAdded ? 'add-article-btn add-article-btn-added' : 'add-article-btn'}
                              onClick={() => toggleArticle(article.id)}
                            >
                              {isAdded ? (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                                  </svg>
                                  Added
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                                  </svg>
                                  Add
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Page Budget bar */}
            <div className="page-budget-bar">
              <div className="page-budget-left">
                <span className="page-budget-title">Page Budget</span>
                <span className="page-budget-info-wrap">
                  <span className="page-budget-info-trigger" aria-describedby="page-budget-tooltip-desc" tabIndex={0}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="page-budget-info">
                      <mask id="pageBudgetInfoIconMask" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                        <rect width="16" height="16" fill="#D9D9D9"/>
                      </mask>
                      <g mask="url(#pageBudgetInfoIconMask)">
                        <path d="M7.33325 11.3334H8.66658V7.33337H7.33325V11.3334ZM8.47492 5.80837C8.6027 5.6806 8.66658 5.52226 8.66658 5.33337C8.66658 5.14448 8.6027 4.98615 8.47492 4.85837C8.34714 4.7306 8.18881 4.66671 7.99992 4.66671C7.81103 4.66671 7.6527 4.7306 7.52492 4.85837C7.39714 4.98615 7.33325 5.14448 7.33325 5.33337C7.33325 5.52226 7.39714 5.6806 7.52492 5.80837C7.6527 5.93615 7.81103 6.00004 7.99992 6.00004C8.18881 6.00004 8.34714 5.93615 8.47492 5.80837ZM7.99992 14.6667C7.0777 14.6667 6.21103 14.4917 5.39992 14.1417C4.58881 13.7917 3.88325 13.3167 3.28325 12.7167C2.68325 12.1167 2.20825 11.4112 1.85825 10.6C1.50825 9.78893 1.33325 8.92226 1.33325 8.00004C1.33325 7.07782 1.50825 6.21115 1.85825 5.40004C2.20825 4.58893 2.68325 3.88337 3.28325 3.28337C3.88325 2.68337 4.58881 2.20837 5.39992 1.85837C6.21103 1.50837 7.0777 1.33337 7.99992 1.33337C8.92214 1.33337 9.78881 1.50837 10.5999 1.85837C11.411 2.20837 12.1166 2.68337 12.7166 3.28337C13.3166 3.88337 13.7916 4.58893 14.1416 5.40004C14.4916 6.21115 14.6666 7.07782 14.6666 8.00004C14.6666 8.92226 14.4916 9.78893 14.1416 10.6C13.7916 11.4112 13.3166 12.1167 12.7166 12.7167C12.1166 13.3167 11.411 13.7917 10.5999 14.1417C9.78881 14.4917 8.92214 14.6667 7.99992 14.6667ZM7.99992 13.3334C9.48881 13.3334 10.7499 12.8167 11.7833 11.7834C12.8166 10.75 13.3333 9.48893 13.3333 8.00004C13.3333 6.51115 12.8166 5.25004 11.7833 4.21671C10.7499 3.18337 9.48881 2.66671 7.99992 2.66671C6.51103 2.66671 5.24992 3.18337 4.21659 4.21671C3.18325 5.25004 2.66659 6.51115 2.66659 8.00004C2.66659 9.48893 3.18325 10.75 4.21659 11.7834C5.24992 12.8167 6.51103 13.3334 7.99992 13.3334Z" fill="#868E94"/>
                      </g>
                    </svg>
                  </span>
                  <span id="page-budget-tooltip-desc" role="tooltip" className="page-budget-tooltip">
                    <span className="page-budget-tooltip-heading">Annual Page Budget</span>
                    <div className="page-budget-tooltip-rows">
                      <div className="page-budget-tooltip-row">
                        <span className="page-budget-tooltip-k">Total Issues / Year</span>
                        <span className="page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.totalIssuesPerYear}</span>
                      </div>
                      <div className="page-budget-tooltip-row">
                        <span className="page-budget-tooltip-k">Per-Issue Budget</span>
                        <span className="page-budget-tooltip-v">{PAGE_BUDGET} pages</span>
                      </div>
                    </div>
                    <div className="page-budget-tooltip-divider" aria-hidden />
                    <div className="page-budget-tooltip-rows">
                      <div className="page-budget-tooltip-row">
                        <span className="page-budget-tooltip-k">Total Annual Allocation</span>
                        <span className="page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.totalAnnualAllocationPages} pages</span>
                      </div>
                      <div className="page-budget-tooltip-row">
                        <span className="page-budget-tooltip-k">Pages Used Till Date</span>
                        <span className="page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.pagesUsedTillDatePages} pages</span>
                      </div>
                      <div className="page-budget-tooltip-row">
                        <span className="page-budget-tooltip-k">Remaining for the Year</span>
                        <span className="page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.remainingForYearPages} pages</span>
                      </div>
                    </div>
                  </span>
                </span>
              </div>
              <div className="page-budget-right">
                <div className="budget-stat">
                  <span className="budget-number">{pagesRemaining}</span>
                  <span className="budget-label">Pages remaining</span>
                </div>
                <div className="budget-divider"></div>
                <div className="budget-stat">
                  <span className="budget-number">{pagesAdded}</span>
                  <span className="budget-label">Pages added</span>
                </div>
                <div className="budget-divider"></div>
                <div className="budget-stat">
                  <span className="budget-number">{PAGE_BUDGET}</span>
                  <span className="budget-label">Issue budget</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="back-button" onClick={() => setCurrentStep(1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                </svg>
                Back
              </button>
              <button type="button" className="submit-button proceed-button" onClick={handleProceed}>
                Proceed
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateIssueModal;
