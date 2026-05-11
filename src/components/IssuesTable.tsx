import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Issue, IssueMilestone, IssueType } from '../types/issue';
import { formatDisplayDateTime } from '../utils/dateFormat';
import './IssuesTable.css';

interface IssuesTableProps {
  issues: Issue[];
  onCreate: () => void;
  onView: (issue: Issue) => void;
  onEdit: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
}

type TabId = 'in-progress' | 'history';

type IssueTypeFilter = 'all' | IssueType;

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  regular: 'Regular',
  special: 'Special',
};

/** The form collects date only, so list dates display with a default 11:00:00 time. */
const formatEstimatedPublication = (iso: string): string => {
  return formatDisplayDateTime(iso, '11:00:00');
};

interface MilestoneBadgeProps {
  milestone: IssueMilestone;
  variant?: 'in-progress' | 'completed';
}

const MilestoneBadge = ({ milestone, variant = 'in-progress' }: MilestoneBadgeProps) => (
  <span className={`issues-table-milestone-badge issues-table-milestone-badge--${variant}`}>
    {variant === 'completed' ? (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="issues-table-milestone-icon">
        <path d="M5.54171 9.45008L3.09171 7.00008L2.33337 7.75841L5.54171 10.9667L12.25 4.25841L11.4917 3.50008L5.54171 9.45008Z" fill="currentColor" />
      </svg>
    ) : (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="issues-table-milestone-icon"
      >
        <path
          d="M2.479 10.675a5.4 5.4 0 0 1-.89-1.444 5.6 5.6 0 0 1-.422-1.648h1.196a4 4 0 0 0 .278 1.205c.156.384.36.741.613 1.072L2.48 10.675ZM1.167 6.417a5.6 5.6 0 0 1 .437-1.648 5.4 5.4 0 0 1 .875-1.444l.817.817a4 4 0 0 0-.613 1.071 4 4 0 0 0-.278 1.205H1.167Zm5.22 6.387a5.6 5.6 0 0 1-1.641-.416 5.4 5.4 0 0 1-1.45-.868l.816-.845a4 4 0 0 0 1.072.626c.378.165.776.276 1.202.335v1.168Zm-2.245-9.479-.846-.846a5.4 5.4 0 0 1 1.473-.868 5.6 5.6 0 0 1 1.648-.416v1.167a4 4 0 0 0-1.205.335 4 4 0 0 0-1.07.628Zm3.412 9.479v-1.167a4 4 0 0 0 1.218-.328 4 4 0 0 0 1.085-.627l.846.845a5.4 5.4 0 0 1-1.45.871 5.6 5.6 0 0 1-1.7.406Zm2.333-9.479a4 4 0 0 0-1.094-.628 4 4 0 0 0-1.21-.335V1.196a5.6 5.6 0 0 1 1.655.416 5.4 5.4 0 0 1 1.466.868l-.817.846Zm1.633 7.35-.817-.817c.253-.331.457-.688.612-1.072.156-.384.249-.787.278-1.205h1.196a5.6 5.6 0 0 1-.422 1.648 5.4 5.4 0 0 1-.847 1.446Zm.117-4.258a4 4 0 0 0-.278-1.205 4 4 0 0 0-.612-1.07l.817-.817c.369.437.665.918.889 1.444a5.6 5.6 0 0 1 .437 1.648h-1.253Z"
          fill="currentColor"
        />
      </svg>
    )}
    {milestone}
  </span>
);

const getLastProcessedAt = (issue: Issue): string =>
  issue.onlinePublicationConfirmedAt
    ?? issue.printConfirmedAt
    ?? issue.folioReviewConfirmedAt
    ?? issue.folioPreparationConfirmedAt
    ?? issue.folioArrangementConfirmedAt
    ?? issue.articleLineupConfirmedAt
    ?? issue.createdAt;

interface RowActionsMenuProps {
  issue: Issue;
  onView: (issue: Issue) => void;
  onEdit: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
}

/** Gap between the kebab trigger and the menu. */
const MENU_GAP = 4;
/** Viewport edge padding so the menu doesn't kiss the window edges. */
const VIEWPORT_PADDING = 8;
/** Initial estimates, replaced by a real measurement once the menu mounts. */
const MENU_INITIAL_WIDTH = 146;
const MENU_INITIAL_HEIGHT = 150;

interface MenuPosition {
  top: number;
  left: number;
  placement: 'below' | 'above';
}

const RowActionsMenu = ({ issue, onView, onEdit, onDelete }: RowActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Computes a viewport-aware position for the menu using fixed coordinates.
   * The menu is portalled into <body>, so it isn't clipped by the table wrapper's overflow.
   */
  const computePosition = useCallback(
    (menuWidth: number = MENU_INITIAL_WIDTH, menuHeight: number = MENU_INITIAL_HEIGHT): MenuPosition | null => {
      const trigger = triggerRef.current;
      if (!trigger) return null;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Right-align the menu's right edge to the trigger's right edge.
      let left = rect.right - menuWidth;
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      } else if (left + menuWidth > vw - VIEWPORT_PADDING) {
        left = vw - menuWidth - VIEWPORT_PADDING;
      }

      // Prefer below the trigger; flip above when there isn't enough room.
      let top = rect.bottom + MENU_GAP;
      let placement: 'below' | 'above' = 'below';
      if (top + menuHeight > vh - VIEWPORT_PADDING) {
        const aboveTop = rect.top - menuHeight - MENU_GAP;
        if (aboveTop >= VIEWPORT_PADDING) {
          top = aboveTop;
          placement = 'above';
        }
      }

      return { top, left, placement };
    },
    [],
  );

  /* Initial position when opening, plus all the "close it" listeners. */
  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    setPosition(computePosition());

    const closeMenu = () => setOpen(false);
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    // Capture phase catches scroll events from any ancestor scroll container too.
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [open, computePosition]);

  /* Once the menu actually mounts, re-measure with its real size so the
     above/below flip and right-edge alignment are exact rather than estimated. */
  useLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    setPosition(prev => {
      const next = computePosition(rect.width, rect.height);
      if (!next) return prev;
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placement === next.placement
      ) {
        return prev;
      }
      return next;
    });
  }, [open, computePosition]);

  const issueLabel = `${issue.journalAcronym} ${issue.volume}/${issue.issue}`;

  return (
    <div className="row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="row-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${issueLabel}`}
        onClick={() => setOpen(o => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
            fill="#5D6871"
          />
        </svg>
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className={`row-actions-menu row-actions-menu--${position.placement}`}
              role="menu"
              aria-label={`Actions for ${issueLabel}`}
              style={{ top: position.top, left: position.left }}
            >
              <div className="row-actions-group">
                <button
                  type="button"
                  role="menuitem"
                  className="row-actions-item"
                  onClick={() => {
                    setOpen(false);
                    onView(issue);
                  }}
                >
                  View
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="row-actions-item"
                  onClick={() => {
                    setOpen(false);
                    onEdit(issue);
                  }}
                >
                  Edit
                </button>
                <div className="row-actions-item row-actions-item--disabled" aria-disabled="true">
                  <span>Prioritize</span>
                  <span className="row-actions-upcoming-badge">Upcoming</span>
                </div>
              </div>
              <div className="row-actions-group">
                <button
                  type="button"
                  role="menuitem"
                  className="row-actions-item"
                  onClick={() => {
                    setOpen(false);
                    onDelete(issue);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

interface FilterDropdownProps {
  label: string;
  value: string;
  displayValue: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  alignRight?: boolean;
}

const FilterDropdown = ({
  label,
  value,
  displayValue,
  options,
  onSelect,
  alignRight,
}: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="issues-filter" ref={wrapperRef}>
      <button
        type="button"
        className="issues-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="issues-filter-label">{label}:</span>
        <span className="issues-filter-value">{displayValue}</span>
        <svg
          className={`issues-filter-chevron${open ? ' issues-filter-chevron--open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path d="M7 10l5 5 5-5H7Z" fill="#35424D" />
        </svg>
      </button>
      {open && (
        <div
          className={`issues-filter-menu${alignRight ? ' issues-filter-menu--right' : ''}`}
          role="listbox"
        >
          {options.map(option => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`issues-filter-item${isSelected ? ' issues-filter-item--selected' : ''}`}
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
              >
                <span className="issues-filter-item-check" aria-hidden>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 10.5l2 2L13 9"
                        stroke="#35424D"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="issues-filter-item-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const IssuesTable = ({ issues, onCreate, onView, onEdit, onDelete }: IssuesTableProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('in-progress');
  const [search, setSearch] = useState('');
  const [journalFilter, setJournalFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<IssueTypeFilter>('all');
  const [showScheduleTooltip, setShowScheduleTooltip] = useState(false);

  /** Reset search/filters when switching tabs so each tab starts clean. */
  useEffect(() => {
    setSearch('');
    setJournalFilter('all');
    setTypeFilter('all');
  }, [activeTab]);

  const inProgressIssues = useMemo(
    () => issues.filter(i => i.status === 'in-progress'),
    [issues],
  );
  const historyIssues = useMemo(() => issues.filter(i => i.status === 'completed'), [issues]);

  const visibleSource = activeTab === 'in-progress' ? inProgressIssues : historyIssues;

  /** Build journal filter options from journals that exist in the current tab. */
  const journalOptions = useMemo(() => {
    const seen = new Map<string, string>();
    visibleSource.forEach(i => {
      if (!seen.has(i.journalId)) seen.set(i.journalId, i.journalAcronym);
    });
    return [
      { id: 'all', label: 'All' },
      ...Array.from(seen.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, acronym]) => ({ id, label: acronym })),
    ];
  }, [visibleSource]);

  const typeOptions = [
    { id: 'all', label: 'All' },
    { id: 'regular', label: 'Regular' },
    { id: 'special', label: 'Special' },
  ];

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleSource.filter(i => {
      if (journalFilter !== 'all' && i.journalId !== journalFilter) return false;
      if (typeFilter !== 'all' && i.issueType !== typeFilter) return false;
      if (!q) return true;
      const haystack = [
        i.journalAcronym,
        i.volume,
        i.issue,
        `${i.volume}/${i.issue}`,
        i.issueTitle,
        i.milestone,
        ISSUE_TYPE_LABEL[i.issueType],
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visibleSource, search, journalFilter, typeFilter]);

  const journalDisplay =
    journalOptions.find(o => o.id === journalFilter)?.label ?? 'All';
  const typeDisplay = typeOptions.find(o => o.id === typeFilter)?.label ?? 'All';

  const hasActiveFilters =
    search.trim() !== '' || journalFilter !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setJournalFilter('all');
    setTypeFilter('all');
  };

  const showInProgressEmptyState =
    activeTab === 'in-progress' && inProgressIssues.length === 0 && historyIssues.length > 0;
  const showHistoryEmptyState =
    activeTab === 'history' && historyIssues.length === 0 && inProgressIssues.length > 0;
  const showTabEmptyState = showInProgressEmptyState || showHistoryEmptyState;
  const inProgressTabLabel = showInProgressEmptyState
    ? 'In progress'
    : `In progress (${inProgressIssues.length})`;
  const historyTabLabel = showHistoryEmptyState ? 'History' : `History (${historyIssues.length})`;

  return (
    <div className="issues-table-page">
      {/* Top header: title + Upload Schedule + Create */}
      <div className="issues-page-header">
        <h1 className="issues-page-title">Issues</h1>

        <div className="issues-page-actions">
          <div
            className="upload-schedule-button-wrapper"
            onMouseEnter={() => setShowScheduleTooltip(true)}
            onMouseLeave={() => setShowScheduleTooltip(false)}
          >
            <button className="upload-schedule-button" disabled>
              <span className="upload-schedule-text">Upload Schedule</span>
              <span className="upcoming-badge">Upcoming</span>
            </button>
            {showScheduleTooltip && (
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

          <button type="button" className="issues-create-button" onClick={onCreate}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
            </svg>
            Create
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="issues-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'in-progress'}
          className={`issues-tab${activeTab === 'in-progress' ? ' issues-tab--active' : ''}`}
          onClick={() => setActiveTab('in-progress')}
        >
          {inProgressTabLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`issues-tab${activeTab === 'history' ? ' issues-tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          {historyTabLabel}
        </button>
      </div>

      {showTabEmptyState ? (
        <div className="issues-tab-empty-state">
          <img
            src="/assets/issue-empty-state.png"
            alt=""
            className="issues-tab-empty-image"
            aria-hidden
          />
          <div className="issues-tab-empty-copy">
            <h2>{showHistoryEmptyState ? 'No completed issues yet' : 'No issues in progress'}</h2>
            <p>Compile articles and get your issue published in few clicks.</p>
          </div>
          {showHistoryEmptyState ? (
            <button
              type="button"
              className="issues-tab-empty-link"
              onClick={() => setActiveTab('in-progress')}
            >
              View Issue In progress
            </button>
          ) : (
            <button type="button" className="issues-tab-empty-create" onClick={onCreate}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
              </svg>
              Create Issue
            </button>
          )}
        </div>
      ) : (
        <>

          {/* Search + filters */}
          <div className="issues-toolbar">
            <label className="issues-search">
              <span className="visually-hidden">Search issues</span>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="#868E94"
                />
              </svg>
            </label>

            <div className="issues-toolbar-filters">
              <FilterDropdown
                label="Journal"
                value={journalFilter}
                displayValue={journalDisplay}
                options={journalOptions}
                onSelect={setJournalFilter}
              />
              <FilterDropdown
                label="Issue Type"
                value={typeFilter}
                displayValue={typeDisplay}
                options={typeOptions}
                onSelect={id => setTypeFilter(id as IssueTypeFilter)}
                alignRight
              />
            </div>
          </div>

          {/* Data table */}
          <div className="issues-data-table-wrapper">
            <table className="issues-data-table">
          <thead>
            <tr>
              <th>Journal</th>
              <th>Volume/Issue</th>
              <th>Issue Type</th>
              <th>Assigned Articles</th>
              <th>Milestone</th>
              <th>{activeTab === 'history' ? 'Last Processed' : 'Estimated Publication'}</th>
              {activeTab === 'in-progress' && (
                <th aria-label="Row actions" className="issues-data-table-action-th" />
              )}
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'history' ? 6 : 7} className="issues-data-table-empty">
                  {visibleSource.length === 0
                    ? activeTab === 'in-progress'
                      ? 'No issues in progress yet.'
                      : 'No issues have completed the publication process yet.'
                    : hasActiveFilters
                      ? (
                        <>
                          <span>No issues match your search or filters.</span>
                          <button
                            type="button"
                            className="issues-data-table-clear"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </button>
                        </>
                      )
                      : 'No issues to display.'}
                </td>
              </tr>
            ) : (
              filteredIssues.map(issue => (
                <tr
                  key={issue.id}
                  className="issues-data-table-row"
                  tabIndex={0}
                  onClick={() => onView(issue)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onView(issue);
                    }
                  }}
                  aria-label={`View issue ${issue.journalAcronym} ${issue.volume}/${issue.issue}`}
                >
                  <td>{issue.journalAcronym}</td>
                  <td>{issue.volume}/{issue.issue}</td>
                  <td>{ISSUE_TYPE_LABEL[issue.issueType]}</td>
                  <td>{issue.assignedArticleIds.length}</td>
                  <td>
                    <MilestoneBadge
                      milestone={issue.milestone}
                      variant={activeTab === 'history' ? 'completed' : 'in-progress'}
                    />
                  </td>
                  <td>
                    {activeTab === 'history'
                      ? formatEstimatedPublication(getLastProcessedAt(issue))
                      : formatEstimatedPublication(issue.publicationDate)}
                  </td>
                  {activeTab === 'in-progress' && (
                    <td
                      className="issues-data-table-action-cell"
                      onClick={event => event.stopPropagation()}
                    >
                      <RowActionsMenu
                        issue={issue}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default IssuesTable;
