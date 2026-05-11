import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Toast, { ToastData } from '../components/Toast';
import { useIssues } from '../hooks/useIssues';
import type { Issue, IssueOutputFormat, IssueType } from '../types/issue';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateFormat';
import './IssueDetails.css';

interface IssueDetailsProps {
  onLogout: () => void;
}

type DetailMilestone =
  | 'Article Lineup'
  | 'Folio Creation'
  | 'Folio Preparation'
  | 'Folio Review'
  | 'Print'
  | 'Online Publication';

const OUTPUT_FORMAT_MILESTONES: Record<IssueOutputFormat, DetailMilestone[]> = {
  print: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Print'],
  online: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Online Publication'],
  both: ['Article Lineup', 'Folio Creation', 'Folio Preparation', 'Folio Review', 'Print', 'Online Publication'],
};

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  regular: 'Regular',
  special: 'Special',
};

const OUTPUT_FORMAT_LABEL: Record<IssueOutputFormat, string> = {
  print: 'Print',
  online: 'Online',
  both: 'Print & Online',
};

const getValidDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const statusLabel = (status: Issue['status']): string =>
  status === 'completed' ? 'Completed' : 'In progress';

const getActiveMilestoneIndex = (issue: Issue, milestones: DetailMilestone[]): number => {
  const normalizedCurrent = issue.milestone === 'Final Review' ? 'Folio Review' : issue.milestone;
  const index = milestones.findIndex(m => m === normalizedCurrent);
  return index >= 0 ? index : 0;
};

const IssueDetails = ({ onLogout }: IssueDetailsProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const navigate = useNavigate();
  const { issueId } = useParams();
  const { issues } = useIssues();

  const issue = issues.find(i => i.id === issueId);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const dismissToast = () => setToast(null);

  const handleEditDetails = () => {
    setToast({
      id: `edit-${Date.now()}`,
      variant: 'info',
      message: 'Editing issue details is coming soon.',
    });
  };

  const timeline = useMemo(() => {
    if (!issue) return [];
    const milestones = OUTPUT_FORMAT_MILESTONES[issue.outputFormat];
    const base = getValidDate(issue.createdAt);
    const activeIndex = getActiveMilestoneIndex(issue, milestones);

    return milestones.map((label, index) => {
      const start = addDays(base, index * 5);
      const completion = addDays(base, (index + 1) * 5);
      return {
        label,
        start,
        completion,
        state: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'upcoming',
      };
    });
  }, [issue]);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarCollapsed(prev => !prev)} onLogout={handleLogout} />

      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />

        <main className="dashboard-main">
          <div className="issue-details-page">
            {!issue ? (
              <div className="issue-details-empty">
                <div className="issue-details-breadcrumb">
                  <Link to="/issues">Issues</Link>
                  <span aria-hidden>›</span>
                  <span>Issue not found</span>
                </div>
                <h1 className="issue-details-title">Issue not found</h1>
                <p className="issue-details-empty-text">
                  This issue may have been deleted or is no longer available in this session.
                </p>
                <Link to="/issues" className="issue-details-back-link">
                  Back to Issues
                </Link>
              </div>
            ) : (
              <>
                <div className="issue-details-topbar">
                  <div>
                    <nav className="issue-details-breadcrumb" aria-label="Breadcrumb">
                      <Link to="/issues">
                        {issue.status === 'completed' ? 'Issue History' : 'Issue In progress'}
                      </Link>
                      <span aria-hidden>›</span>
                    </nav>
                    <h1 className="issue-details-title">
                      {issue.journalAcronym} - {issue.volume}/{issue.issue}
                    </h1>
                  </div>

                  <button type="button" className="issue-details-conversation-button">
                    New Conversation
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7 10l5 5 5-5H7Z" fill="currentColor" />
                    </svg>
                  </button>
                </div>

                <section className="issue-details-section" aria-labelledby="issue-details-heading">
                  <div className="issue-details-section-head">
                    <h2 id="issue-details-heading" className="issue-details-section-title">
                      Issue Details
                    </h2>
                    <button type="button" className="issue-details-edit-button" onClick={handleEditDetails}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
                          fill="currentColor"
                        />
                      </svg>
                      Edit Details
                    </button>
                  </div>

                  <dl className="issue-details-grid">
                    <div className="issue-details-cell">
                      <dt>Journal</dt>
                      <dd>{issue.journalAcronym}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Vol/Issue</dt>
                      <dd>{issue.volume}/{issue.issue}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Type</dt>
                      <dd>{ISSUE_TYPE_LABEL[issue.issueType]}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Cover Month</dt>
                      <dd>{issue.coverMonth || '—'}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Status</dt>
                      <dd>
                        <span className={`issue-status-pill issue-status-pill--${issue.status}`}>
                          {statusLabel(issue.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Assigned Articles</dt>
                      <dd>{issue.assignedArticleIds.length}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Issue Close Date</dt>
                      <dd>{formatDisplayDate(issue.issueCloseDate)}</dd>
                    </div>
                    <div className="issue-details-cell">
                      <dt>Online Pub. Date</dt>
                      <dd>{formatDisplayDate(issue.publicationDate)}</dd>
                    </div>
                    <div className="issue-details-cell issue-details-cell--full">
                      <dt>Output Format</dt>
                      <dd>{OUTPUT_FORMAT_LABEL[issue.outputFormat]}</dd>
                    </div>
                    {issue.issueTitle.trim() && (
                      <div className="issue-details-cell issue-details-cell--full">
                        <dt>Issue Title</dt>
                        <dd>{issue.issueTitle}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="issue-progress-section" aria-labelledby="issue-progress-heading">
                  <h2 id="issue-progress-heading" className="issue-details-section-title">
                    Progress
                  </h2>
                  <ol className="issue-progress-list">
                    {timeline.map((step, index) => (
                      <li
                        key={step.label}
                        className={`issue-progress-item issue-progress-item--${step.state}`}
                      >
                        <span className="issue-progress-marker" aria-hidden>
                          {step.state === 'completed' && (
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M7.5 10.5l2 2L13 9"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        {index < timeline.length - 1 && <span className="issue-progress-line" aria-hidden />}
                        <div className="issue-progress-content">
                          <div className="issue-progress-row">
                            <span className="issue-progress-title">{step.label}</span>
                            {step.state === 'active' && step.label === 'Article Lineup' && (
                              <button type="button" className="issue-progress-action">
                                Create
                              </button>
                            )}
                          </div>
                          <p className="issue-progress-dates">
                            <span>Start: {formatDisplayDateTime(step.start)}</span>
                            <span className="issue-progress-date-separator">|</span>
                            <span>Est. Completion: {formatDisplayDateTime(step.completion)}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};

export default IssueDetails;
