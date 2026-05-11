import { useEffect, useMemo, useRef, useState } from 'react';
import { JOURNALS, getJournalAcronym } from '../data/journals';
import type { Issue, IssueOutputFormat, IssueType } from '../types/issue';
import './EditIssueDetailsModal.css';

interface EditIssueDetailsModalProps {
  isOpen: boolean;
  issue: Issue | null;
  onClose: () => void;
  onSave: (issueId: string, updates: Partial<Issue>) => void;
}

interface EditIssueForm {
  journalId: string;
  volume: string;
  issue: string;
  issueTitle: string;
  coverMonth: string;
  publicationDate: string;
  issueCloseDate: string;
  issueType: IssueType;
  outputFormat: IssueOutputFormat;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  regular: 'Regular',
  special: 'Special',
};

const OUTPUT_FORMAT_LABEL: Record<IssueOutputFormat, string> = {
  print: 'Print',
  online: 'Online',
  both: 'Both',
};

const getEmptyForm = (): EditIssueForm => ({
  journalId: '',
  volume: '',
  issue: '',
  issueTitle: '',
  coverMonth: '',
  publicationDate: '',
  issueCloseDate: '',
  issueType: 'regular',
  outputFormat: 'both',
});

const formFromIssue = (issue: Issue): EditIssueForm => ({
  journalId: issue.journalId,
  volume: issue.volume,
  issue: issue.issue,
  issueTitle: issue.issueTitle,
  coverMonth: issue.coverMonth,
  publicationDate: issue.publicationDate,
  issueCloseDate: issue.issueCloseDate,
  issueType: issue.issueType,
  outputFormat: issue.outputFormat,
});

const EditIssueDetailsModal = ({
  isOpen,
  issue,
  onClose,
  onSave,
}: EditIssueDetailsModalProps) => {
  const [form, setForm] = useState<EditIssueForm>(getEmptyForm);
  const [journalSearch, setJournalSearch] = useState('');
  const [showJournalDropdown, setShowJournalDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EditIssueForm, string>>>({});
  const journalDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !issue) return;
    setForm(formFromIssue(issue));
    setJournalSearch(issue.journalAcronym);
    setErrors({});
    setShowJournalDropdown(false);
    setShowMonthDropdown(false);
  }, [isOpen, issue]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (journalDropdownRef.current && !journalDropdownRef.current.contains(target)) {
        setShowJournalDropdown(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(target)) {
        setShowMonthDropdown(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const filteredJournals = useMemo(() => {
    const term = journalSearch.trim().toLowerCase();
    return JOURNALS.filter(journal =>
      journal.acronym.toLowerCase().includes(term) ||
      journal.fullName.toLowerCase().includes(term)
    );
  }, [journalSearch]);

  const setField = (field: keyof EditIssueForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const setNumericField = (field: 'volume' | 'issue', value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setField(field, value);
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof EditIssueForm, string>> = {};
    if (!form.journalId) nextErrors.journalId = 'Journal is required';
    if (!form.volume) nextErrors.volume = 'Volume is required';
    if (!form.issue) nextErrors.issue = 'Issue is required';
    if (!form.coverMonth) nextErrors.coverMonth = 'Cover Month is required';
    if (!form.publicationDate) nextErrors.publicationDate = 'Publication Date is required';
    if (!form.issueCloseDate) nextErrors.issueCloseDate = 'Issue Close Date is required';

    if (form.publicationDate && form.issueCloseDate) {
      const publication = new Date(`${form.publicationDate}T12:00:00`);
      const close = new Date(`${form.issueCloseDate}T12:00:00`);
      if (close >= publication) {
        nextErrors.issueCloseDate = 'Issue Close Date must be before Publication Date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!issue || !validate()) return;
    onSave(issue.id, {
      journalId: form.journalId,
      journalAcronym: getJournalAcronym(form.journalId),
      volume: form.volume,
      issue: form.issue,
      issueTitle: form.issueTitle,
      coverMonth: form.coverMonth,
      publicationDate: form.publicationDate,
      issueCloseDate: form.issueCloseDate,
      // Intentionally excluded: issueType and outputFormat are locked after creation.
    });
    onClose();
  };

  if (!isOpen || !issue) return null;

  return (
    <div className="edit-issue-modal-overlay" onClick={onClose}>
      <div
        className="edit-issue-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-issue-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="edit-issue-modal-header">
          <h2 id="edit-issue-title" className="edit-issue-modal-title">Edit Details</h2>
          <button type="button" className="edit-issue-modal-close" aria-label="Close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" fill="#5D6871" />
            </svg>
          </button>
        </div>

        <div className="edit-issue-modal-body">
          <div className="edit-issue-field">
            <label className="edit-issue-label">Journal <span aria-hidden>*</span></label>
            <div className="edit-issue-dropdown" ref={journalDropdownRef}>
              <div className={`edit-issue-input edit-issue-dropdown-input ${errors.journalId ? 'edit-issue-input--error' : ''}`}>
                <input
                  value={journalSearch}
                  placeholder="Select Journal"
                  onFocus={() => setShowJournalDropdown(true)}
                  onChange={event => {
                    setJournalSearch(event.target.value);
                    setShowJournalDropdown(true);
                    setField('journalId', '');
                  }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 10l5 5 5-5H7Z" fill="#5D6871" />
                </svg>
              </div>
              {showJournalDropdown && (
                <div className="edit-issue-menu">
                  {filteredJournals.length > 0 ? filteredJournals.map(journal => (
                    <button
                      key={journal.id}
                      type="button"
                      className="edit-issue-menu-item"
                      onClick={() => {
                        setForm(prev => ({ ...prev, journalId: journal.id }));
                        setJournalSearch(journal.acronym);
                        setErrors(prev => ({ ...prev, journalId: '' }));
                        setShowJournalDropdown(false);
                      }}
                    >
                      {journal.acronym}
                    </button>
                  )) : (
                    <div className="edit-issue-menu-empty">No journals found</div>
                  )}
                </div>
              )}
            </div>
            {errors.journalId && <span className="edit-issue-error">{errors.journalId}</span>}
          </div>

          <div className="edit-issue-row">
            <div className="edit-issue-field">
              <label className="edit-issue-label">Volume <span aria-hidden>*</span></label>
              <input
                className={`edit-issue-input ${errors.volume ? 'edit-issue-input--error' : ''}`}
                value={form.volume}
                onChange={event => setNumericField('volume', event.target.value)}
              />
              {errors.volume && <span className="edit-issue-error">{errors.volume}</span>}
            </div>
            <div className="edit-issue-field">
              <label className="edit-issue-label">Issue <span aria-hidden>*</span></label>
              <input
                className={`edit-issue-input ${errors.issue ? 'edit-issue-input--error' : ''}`}
                value={form.issue}
                onChange={event => setNumericField('issue', event.target.value)}
              />
              {errors.issue && <span className="edit-issue-error">{errors.issue}</span>}
            </div>
          </div>

          <div className="edit-issue-field">
            <label className="edit-issue-label">Issue Title</label>
            <input
              className="edit-issue-input"
              placeholder="Enter Title"
              value={form.issueTitle}
              onChange={event => setField('issueTitle', event.target.value)}
            />
          </div>

          <div className="edit-issue-field">
            <label className="edit-issue-label">Cover Month <span aria-hidden>*</span></label>
            <div className="edit-issue-dropdown" ref={monthDropdownRef}>
              <button
                type="button"
                className={`edit-issue-input edit-issue-dropdown-button ${errors.coverMonth ? 'edit-issue-input--error' : ''}`}
                onClick={() => setShowMonthDropdown(prev => !prev)}
              >
                <span className={form.coverMonth ? '' : 'edit-issue-placeholder'}>
                  {form.coverMonth || 'Select Cover Month'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 10l5 5 5-5H7Z" fill="#5D6871" />
                </svg>
              </button>
              {showMonthDropdown && (
                <div className="edit-issue-menu">
                  {MONTHS.map(month => (
                    <button
                      key={month}
                      type="button"
                      className="edit-issue-menu-item"
                      onClick={() => {
                        setField('coverMonth', month);
                        setShowMonthDropdown(false);
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.coverMonth && <span className="edit-issue-error">{errors.coverMonth}</span>}
          </div>

          <div className="edit-issue-row">
            <div className="edit-issue-field">
              <label className="edit-issue-label">Publication Date <span aria-hidden>*</span></label>
              <input
                type="date"
                className={`edit-issue-input edit-issue-date-input ${errors.publicationDate ? 'edit-issue-input--error' : ''}`}
                value={form.publicationDate}
                onChange={event => setField('publicationDate', event.target.value)}
              />
              {errors.publicationDate && <span className="edit-issue-error">{errors.publicationDate}</span>}
            </div>
            <div className="edit-issue-field">
              <label className="edit-issue-label">Issue Close Date <span aria-hidden>*</span></label>
              <input
                type="date"
                className={`edit-issue-input edit-issue-date-input ${errors.issueCloseDate ? 'edit-issue-input--error' : ''}`}
                value={form.issueCloseDate}
                onChange={event => setField('issueCloseDate', event.target.value)}
              />
              {errors.issueCloseDate && <span className="edit-issue-error">{errors.issueCloseDate}</span>}
            </div>
          </div>

          <div className="edit-issue-field">
            <span className="edit-issue-label">Issue Type <span aria-hidden>*</span></span>
            <div className="edit-issue-radio-group" aria-label="Issue Type">
              {(['regular', 'special'] as const).map(value => (
                <label key={value} className="edit-issue-radio-label edit-issue-radio-label--locked">
                  <input type="radio" checked={form.issueType === value} disabled readOnly />
                  <span className="edit-issue-radio-control" />
                  <span>{ISSUE_TYPE_LABEL[value]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="edit-issue-field">
            <span className="edit-issue-label">Output Format <span aria-hidden>*</span></span>
            <div className="edit-issue-radio-group" aria-label="Output Format">
              {(['print', 'online', 'both'] as const).map(value => (
                <label key={value} className="edit-issue-radio-label edit-issue-radio-label--locked">
                  <input type="radio" checked={form.outputFormat === value} disabled readOnly />
                  <span className="edit-issue-radio-control" />
                  <span>{OUTPUT_FORMAT_LABEL[value]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="edit-issue-modal-footer">
          <button type="button" className="edit-issue-done-button" onClick={handleSubmit}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditIssueDetailsModal;
