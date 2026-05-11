import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CreateIssueModal, { IssueFormData } from '../components/CreateIssueModal';
import IssuesTable from '../components/IssuesTable';
import IssueDeleteModal from '../components/IssueDeleteModal';
import Toast, { ToastData } from '../components/Toast';
import { useIssues } from '../hooks/useIssues';
import { getJournalAcronym } from '../data/journals';
import type { Issue, IssueMilestone } from '../types/issue';
import './Issues.css';

interface IssuesProps {
  onLogout: () => void;
}

const generateId = (): string => {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const milestoneFromLineupStatus = (
  status: IssueFormData['lineupStatus'],
): IssueMilestone => (status === 'confirm' ? 'Folio Creation' : 'Article Lineup');

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

const Issues = ({ onLogout }: IssuesProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEmptyStateTooltip, setShowEmptyStateTooltip] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const navigate = useNavigate();

  const { issues, addIssue, removeIssue, restoreIssue } = useIssues();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleMenuClick = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => setShowCreateModal(false);

  const dismissToast = useCallback(() => setToast(null), []);

  const showSuccessToast = (message: string) => {
    setToast({
      id: generateId(),
      variant: 'success',
      message,
    });
  };

  const showInfoToast = (message: string, action?: ToastData['action']) => {
    setToast({
      id: generateId(),
      variant: 'info',
      message,
      action,
    });
  };

  const handleSubmitIssue = (data: IssueFormData) => {
    // Only the final "Create Issue" action from the Review step persists an issue.
    // Intermediate transitions (proceed / save-draft / confirm-lineup) stay inside the modal.
    if (data.lineupAction !== 'create-issue') {
      return;
    }

    if (
      data.issueType !== 'regular' &&
      data.issueType !== 'special'
    ) {
      return;
    }
    if (
      data.outputFormat !== 'print' &&
      data.outputFormat !== 'online' &&
      data.outputFormat !== 'both'
    ) {
      return;
    }

    const journalAcronym = getJournalAcronym(data.journal);
    const createdAt = new Date().toISOString();
    const newIssue: Issue = {
      id: generateId(),
      journalId: data.journal,
      journalAcronym,
      volume: data.volume,
      issue: data.issue,
      issueTitle: data.issueTitle,
      coverMonth: data.coverMonth,
      publicationDate: data.publicationDate,
      issueCloseDate: data.issueCloseDate,
      issueType: data.issueType,
      outputFormat: data.outputFormat,
      assignedArticleIds: (data.selectedArticles ?? []).map(a => a.id),
      articleLineupConfirmedAt: data.lineupStatus === 'confirm' ? createdAt : undefined,
      articleLineupConfirmedBy: data.lineupStatus === 'confirm' ? 'John Doe' : undefined,
      milestone: milestoneFromLineupStatus(data.lineupStatus),
      status: 'in-progress',
      createdAt,
    };

    addIssue(newIssue);
    showSuccessToast(
      `Issue ${newIssue.journalAcronym} ${newIssue.volume}/${newIssue.issue} created successfully`,
    );
  };

  const navigateToIssueDetails = (issue: Issue) => {
    const to = `/issues/${issue.id}`;
    const transitionDocument = document as ViewTransitionDocument;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (transitionDocument.startViewTransition && !prefersReducedMotion) {
      transitionDocument.startViewTransition(() => {
        flushSync(() => navigate(to));
      });
      return;
    }

    navigate(to);
  };

  const handleView = (issue: Issue) => {
    navigateToIssueDetails(issue);
  };

  const handleEdit = (_issue: Issue) => {
    showInfoToast('Editing existing issues is coming soon.');
  };

  const requestDelete = (issue: Issue) => {
    setIssueToDelete(issue);
  };

  const cancelDelete = () => setIssueToDelete(null);

  const confirmDelete = () => {
    if (!issueToDelete) return;
    const deleted = issueToDelete;
    removeIssue(deleted.id);
    setIssueToDelete(null);
    showInfoToast(`Issue ${deleted.journalAcronym} ${deleted.volume}/${deleted.issue} is deleted`, {
      label: 'Undo',
      onClick: () => restoreIssue(deleted),
    });
  };

  const renderEmptyState = () => (
    <div className="issues-container">
      <div className="issues-header">
        <h1 className="issues-title">Issues</h1>
        <div
          className="upload-schedule-button-wrapper"
          onMouseEnter={() => setShowEmptyStateTooltip(true)}
          onMouseLeave={() => setShowEmptyStateTooltip(false)}
        >
          <button className="upload-schedule-button" disabled>
            <span className="upload-schedule-text">Upload Schedule</span>
            <span className="upcoming-badge">Upcoming</span>
          </button>
          {showEmptyStateTooltip && (
            <div className="schedule-tooltip">
              <div className="tooltip-arrow" />
              <div className="tooltip-content">
                <p className="tooltip-main">See all your issue details and timelines in one place.</p>
                <p className="tooltip-sub">
                  Upload your schedule to manage deadlines across all journals and get notified when
                  action is needed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="issues-empty-state">
        <div className="empty-state-content">
          <img
            src="/assets/issue-empty-state.png"
            alt="Empty issues"
            className="empty-state-image"
          />
          <div className="empty-state-text">
            <h2 className="empty-state-title">Get Publish-Ready in clicks</h2>
            <p className="empty-state-description">
              Compile articles and get your issue published in few clicks.
            </p>
          </div>
          <button className="create-issue-button" onClick={openCreateModal}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="white" />
            </svg>
            <span>Create Issue</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />

      <div className="dashboard-layout">
        <Sidebar isCollapsed={sidebarCollapsed} />

        <main className="dashboard-main">
          {issues.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="issues-container issues-container--with-data">
              <IssuesTable
                issues={issues}
                onCreate={openCreateModal}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={requestDelete}
              />
            </div>
          )}
        </main>
      </div>

      <CreateIssueModal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        onSubmit={handleSubmitIssue}
      />

      <IssueDeleteModal
        isOpen={issueToDelete !== null}
        issueLabel={
          issueToDelete
            ? `${issueToDelete.journalAcronym} ${issueToDelete.volume}/${issueToDelete.issue}`
            : ''
        }
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};

export default Issues;
