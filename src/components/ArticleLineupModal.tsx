import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ANNUAL_PAGE_BUDGET_TOOLTIP,
  ARTICLES_BY_JOURNAL,
  MILESTONES,
  PAGE_BUDGET,
  SORT_OPTIONS,
  type Article,
} from '../data/articles';
import type { Issue } from '../types/issue';
import { formatDisplayDateTime } from '../utils/dateFormat';
import './ArticleLineupModal.css';

interface ArticleLineupModalProps {
  isOpen: boolean;
  issue: Issue | null;
  title?: string;
  headerAction?: 'close' | 'back';
  initialArticleIds?: string[];
  manageBodyScroll?: boolean;
  isClosing?: boolean;
  onClose: () => void;
  onConfirm: (issueId: string, articleIds: string[]) => void;
}

const getMilestoneBadgeClass = (variant: Article['milestoneVariant']) =>
  variant === 'paused'
    ? 'article-lineup-milestone article-lineup-milestone--paused'
    : 'article-lineup-milestone article-lineup-milestone--inprogress';

const highlight = (text: string, query: string): ReactNode => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;
  const regex = new RegExp(`(${trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const normalizedQuery = trimmedQuery.toLowerCase();
  return text.split(regex).map((part, index) =>
    part.toLowerCase() === normalizedQuery ? <mark key={`${part}-${index}`}>{part}</mark> : part,
  );
};

const sortArticles = (sortBy: string) => (a: Article, b: Article) => {
  if (sortBy === 'acceptance-asc') return a.id.localeCompare(b.id);
  if (sortBy === 'acceptance-desc') return b.id.localeCompare(a.id);
  return 0;
};

const ArticleLineupModal = ({
  isOpen,
  issue,
  title = 'Article Lineup',
  headerAction = 'close',
  initialArticleIds,
  manageBodyScroll = true,
  isClosing = false,
  onClose,
  onConfirm,
}: ArticleLineupModalProps) => {
  const [articleSearch, setArticleSearch] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState('All');
  const [sortBy, setSortBy] = useState('acceptance-asc');
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [showMilestoneDropdown, setShowMilestoneDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showGoDownFab, setShowGoDownFab] = useState(false);
  const [showGoUpFab, setShowGoUpFab] = useState(false);

  const milestoneDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const assignedSectionRef = useRef<HTMLDivElement>(null);

  const availableArticles = useMemo(
    () => (issue ? ARTICLES_BY_JOURNAL[issue.journalId] ?? [] : []),
    [issue],
  );

  const matchesArticleFilters = useCallback((article: Article) => {
    const normalizedSearch = articleSearch.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      article.id.toLowerCase().includes(normalizedSearch) ||
      article.title.toLowerCase().includes(normalizedSearch) ||
      article.author.toLowerCase().includes(normalizedSearch);
    const matchesMilestone = milestoneFilter === 'All' || article.milestone === milestoneFilter;
    return matchesSearch && matchesMilestone;
  }, [articleSearch, milestoneFilter]);

  const selectedArticles = useMemo(
    () => availableArticles.filter(article => selectedArticleIds.has(article.id)),
    [availableArticles, selectedArticleIds],
  );

  const unassignedArticles = useMemo(
    () => availableArticles.filter(article => !selectedArticleIds.has(article.id)),
    [availableArticles, selectedArticleIds],
  );

  const visibleAvailableArticles = useMemo(
    () => unassignedArticles.filter(matchesArticleFilters).sort(sortArticles(sortBy)),
    [matchesArticleFilters, sortBy, unassignedArticles],
  );

  const visibleAssignedArticles = useMemo(
    () => selectedArticles.filter(matchesArticleFilters).sort(sortArticles(sortBy)),
    [matchesArticleFilters, selectedArticles, sortBy],
  );

  const pagesAdded = selectedArticles.reduce((sum, article) => sum + article.pages, 0);
  const pagesRemaining = PAGE_BUDGET - pagesAdded;
  const pageBudgetExceeded = issue?.issueType === 'regular' && pagesAdded > PAGE_BUDGET;
  const sortLabel = SORT_OPTIONS.find(option => option.value === sortBy)?.label ?? SORT_OPTIONS[0].label;
  const hasAssignedArticles = selectedArticleIds.size > 0;
  const showPageBudget = issue?.issueType === 'regular';

  const updateFabVisibility = useCallback(() => {
    if (!scrollContainerRef.current || !assignedSectionRef.current || !hasAssignedArticles || unassignedArticles.length === 0) {
      setShowGoDownFab(false);
      setShowGoUpFab(false);
      return;
    }

    const container = scrollContainerRef.current;
    const cRect = container.getBoundingClientRect();
    const aRect = assignedSectionRef.current.getBoundingClientRect();

    // Offset of assigned section from top of scroll content (stable while layout is fixed).
    const assignedContentTop = container.scrollTop + (aRect.top - cRect.top);
    // User has scrolled into assigned when the visible viewport covers the start of that section
    // (the old midpoint check missed short assigned blocks that only sat in the lower half).
    const viewportBottomInContent = container.scrollTop + container.clientHeight;
    const isViewingAssigned = viewportBottomInContent > assignedContentTop + 40;

    setShowGoDownFab(!isViewingAssigned);
    setShowGoUpFab(isViewingAssigned);
  }, [hasAssignedArticles, unassignedArticles.length]);

  useEffect(() => {
    if (!isOpen || !issue) return;
    setSelectedArticleIds(new Set(initialArticleIds ?? issue.assignedArticleIds));
    setArticleSearch('');
    setMilestoneFilter('All');
    setSortBy('acceptance-asc');
    setShowMilestoneDropdown(false);
    setShowSortDropdown(false);
    setShowGoDownFab(false);
    setShowGoUpFab(false);
  }, [initialArticleIds, isOpen, issue]);

  useEffect(() => {
    if (!isOpen || !manageBodyScroll) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, manageBodyScroll]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    if (!isOpen) return;
    const timer = window.setTimeout(updateFabVisibility, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, updateFabVisibility, visibleAvailableArticles.length, visibleAssignedArticles.length]);

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => updateFabVisibility());
    return () => cancelAnimationFrame(id);
  }, [isOpen, hasAssignedArticles, updateFabVisibility]);

  if (!isOpen || !issue) return null;

  const clearLineupFilters = () => {
    setArticleSearch('');
    setMilestoneFilter('All');
  };

  const scrollToAssigned = () => {
    assignedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleArticle = (articleId: string) => {
    setSelectedArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!hasAssignedArticles) return;

    const orderedIds = availableArticles
      .filter(article => selectedArticleIds.has(article.id))
      .map(article => article.id);
    onConfirm(issue.id, orderedIds);
    onClose();
  };

  const renderEmptyState = (message: string) => (
    <div className="article-lineup-table-wrap article-lineup-table-empty" role="status">
      <div className="article-lineup-no-results">
        <p>No results found</p>
        <span>{message}</span>
        <button type="button" onClick={clearLineupFilters}>
          Clear filter
        </button>
      </div>
    </div>
  );

  const renderArticleTable = (articles: Article[], action: 'add' | 'remove') => (
    <div className={articles.length >= 5 ? 'article-lineup-table-wrap article-lineup-table-wrap--fill' : 'article-lineup-table-wrap'}>
      <table className="article-lineup-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Type</th>
            <th>Content</th>
            <th>Pages</th>
            <th>Milestone</th>
            <th>Estimated Publication</th>
            <th>Acceptance</th>
            <th className="article-lineup-action-th" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {articles.map(article => (
            <tr key={article.id}>
              <td>
                <span className="article-lineup-id">{highlight(article.id, articleSearch)}</span>
              </td>
              <td className="article-lineup-type">{article.type}</td>
              <td className="article-lineup-content-cell">
                <div className="article-lineup-title-row">
                  <span className="article-lineup-article-title">
                    {highlight(article.title, articleSearch)}
                  </span>
                  <span className="article-lineup-doi-wrapper">
                    <button type="button" className="doi-icon-btn" aria-label={`View DOI for ${article.id}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <mask id={`article-lineup-doi-mask-${article.id}`} style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                          <rect width="16" height="16" fill="#D9D9D9" />
                        </mask>
                        <g mask={`url(#article-lineup-doi-mask-${article.id})`}>
                          <path
                            d="M5.41659 14.1417C4.60547 13.7917 3.89714 13.3139 3.29159 12.7083C2.68603 12.1028 2.20825 11.3945 1.85825 10.5833C1.50825 9.77223 1.33325 8.90834 1.33325 7.99168C1.33325 7.07501 1.50825 6.2139 1.85825 5.40834C2.20825 4.60279 2.68603 3.89723 3.29159 3.29168C3.89714 2.68612 4.60547 2.20834 5.41659 1.85834C6.2277 1.50834 7.09158 1.33334 8.00825 1.33334C8.92492 1.33334 9.78603 1.50834 10.5916 1.85834C11.3971 2.20834 12.1027 2.68612 12.7083 3.29168C13.3138 3.89723 13.7916 4.60279 14.1416 5.40834C14.4916 6.2139 14.6666 7.07501 14.6666 7.99168C14.6666 8.90834 14.4916 9.77223 14.1416 10.5833C13.7916 11.3945 13.3138 12.1028 12.7083 12.7083C12.1027 13.3139 11.3971 13.7917 10.5916 14.1417C9.78603 14.4917 8.92492 14.6667 8.00825 14.6667C7.09158 14.6667 6.2277 14.4917 5.41659 14.1417ZM7.99992 13.3C8.28881 12.9 8.53881 12.4833 8.74992 12.05C8.96103 11.6167 9.13325 11.1556 9.26659 10.6667H6.73325C6.86659 11.1556 7.03881 11.6167 7.24992 12.05C7.46103 12.4833 7.71103 12.9 7.99992 13.3ZM6.26659 13.0333C6.06659 12.6667 5.89159 12.2861 5.74159 11.8917C5.59159 11.4972 5.46659 11.0889 5.36659 10.6667H3.39992C3.72214 11.2222 4.12492 11.7056 4.60825 12.1167C5.09159 12.5278 5.64436 12.8333 6.26659 13.0333ZM9.73325 13.0333C10.3555 12.8333 10.9083 12.5278 11.3916 12.1167C11.8749 11.7056 12.2777 11.2222 12.5999 10.6667H10.6333C10.5333 11.0889 10.4083 11.4972 10.2583 11.8917C10.1083 12.2861 9.93325 12.6667 9.73325 13.0333ZM2.83325 9.33334H5.09992C5.06659 9.11112 5.04159 8.89168 5.02492 8.67501C5.00825 8.45834 4.99992 8.23334 4.99992 8.00001C4.99992 7.76668 5.00825 7.54168 5.02492 7.32501C5.04159 7.10834 5.06659 6.8889 5.09992 6.66668H2.83325C2.7777 6.8889 2.73603 7.10834 2.70825 7.32501C2.68047 7.54168 2.66659 7.76668 2.66659 8.00001C2.66659 8.23334 2.68047 8.45834 2.70825 8.67501C2.73603 8.89168 2.7777 9.11112 2.83325 9.33334ZM6.43325 9.33334H9.56659C9.59992 9.11112 9.62492 8.89168 9.64159 8.67501C9.65825 8.45834 9.66658 8.23334 9.66658 8.00001C9.66658 7.76668 9.65825 7.54168 9.64159 7.32501C9.62492 7.10834 9.59992 6.8889 9.56659 6.66668H6.43325C6.39992 6.8889 6.37492 7.10834 6.35825 7.32501C6.34158 7.54168 6.33325 7.76668 6.33325 8.00001C6.33325 8.23334 6.34158 8.45834 6.35825 8.67501C6.37492 8.89168 6.39992 9.11112 6.43325 9.33334ZM10.8999 9.33334H13.1666C13.2221 9.11112 13.2638 8.89168 13.2916 8.67501C13.3194 8.45834 13.3333 8.23334 13.3333 8.00001C13.3333 7.76668 13.3194 7.54168 13.2916 7.32501C13.2638 7.10834 13.2221 6.8889 13.1666 6.66668H10.8999C10.9333 6.8889 10.9583 7.10834 10.9749 7.32501C10.9916 7.54168 10.9999 7.76668 10.9999 8.00001C10.9999 8.23334 10.9916 8.45834 10.9749 8.67501C10.9583 8.89168 10.9333 9.11112 10.8999 9.33334ZM10.6333 5.33334H12.5999C12.2777 4.77779 11.8749 4.29445 11.3916 3.88334C10.9083 3.47223 10.3555 3.16668 9.73325 2.96668C9.93325 3.33334 10.1083 3.7139 10.2583 4.10834C10.4083 4.50279 10.5333 4.91112 10.6333 5.33334ZM6.73325 5.33334H9.26659C9.13325 4.84445 8.96103 4.38334 8.74992 3.95001C8.53881 3.51668 8.28881 3.10001 7.99992 2.70001C7.71103 3.10001 7.46103 3.51668 7.24992 3.95001C7.03881 4.38334 6.86659 4.84445 6.73325 5.33334ZM3.39992 5.33334H5.36659C5.46659 4.91112 5.59159 4.50279 5.74159 4.10834C5.89159 3.7139 6.06659 3.33334 6.26659 2.96668C5.64436 3.16668 5.09159 3.47223 4.60825 3.88334C4.12492 4.29445 3.72214 4.77779 3.39992 5.33334Z"
                            fill="#35424D"
                          />
                        </g>
                      </svg>
                    </button>
                    <span className="article-lineup-doi-tooltip">
                      <span className="article-lineup-doi-tooltip-label">DOI</span>
                      <span className="article-lineup-doi-tooltip-value">{article.doi}</span>
                    </span>
                  </span>
                </div>
                <span className="article-lineup-author">{highlight(article.author, articleSearch)}</span>
              </td>
              <td className="article-lineup-pages">{article.pages}</td>
              <td>
                <span className={getMilestoneBadgeClass(article.milestoneVariant)}>
                  {article.milestoneVariant === 'paused' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 19h4V5H6v14Zm8-14v14h4V5h-4Z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <mask
                        id={`article-lineup-milestone-inprogress-mask-${article.id}-${action}`}
                        style={{ maskType: 'alpha' }}
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="14"
                        height="14"
                      >
                        <rect width="14" height="14" fill="#D9D9D9" />
                      </mask>
                      <g mask={`url(#article-lineup-milestone-inprogress-mask-${article.id}-${action})`}>
                        <path
                          d="M2.479 10.675C2.10956 10.2375 1.81303 9.75622 1.58942 9.23122C1.36581 8.70622 1.22484 8.15691 1.1665 7.5833H2.36234C2.42067 8.00136 2.52762 8.4024 2.68317 8.78643C2.83873 9.17045 3.04289 9.52775 3.29567 9.8583L2.479 10.675ZM1.1665 6.41663C1.24428 5.84302 1.39012 5.29372 1.604 4.76872C1.81789 4.24372 2.10956 3.76247 2.479 3.32497L3.29567 4.14163C3.04289 4.47219 2.83873 4.82948 2.68317 5.21351C2.52762 5.59754 2.42067 5.99858 2.36234 6.41663H1.1665ZM6.38734 12.8041C5.81373 12.7458 5.26685 12.6073 4.74671 12.3885C4.22657 12.1698 3.74289 11.8805 3.29567 11.5208L4.11234 10.675C4.45262 10.9277 4.81234 11.1368 5.1915 11.3021C5.57067 11.4673 5.96928 11.5791 6.38734 11.6375V12.8041ZM4.1415 3.32497L3.29567 2.47913C3.75262 2.11941 4.24359 1.83018 4.76859 1.61143C5.29359 1.39268 5.84289 1.25413 6.4165 1.1958V2.36247C5.99845 2.4208 5.59741 2.53261 5.21338 2.69788C4.82935 2.86316 4.47206 3.07219 4.1415 3.32497ZM7.554 12.8041V11.6375C7.98178 11.5791 8.38769 11.4698 8.77171 11.3093C9.15574 11.1489 9.51789 10.9375 9.85817 10.675L10.704 11.5208C10.2471 11.8902 9.75366 12.1819 9.2238 12.3958C8.69393 12.6097 8.13734 12.7458 7.554 12.8041ZM9.88734 3.32497C9.54706 3.07219 9.18248 2.86316 8.79359 2.69788C8.4047 2.53261 8.00123 2.4208 7.58317 2.36247V1.1958C8.15678 1.25413 8.70852 1.39268 9.23838 1.61143C9.76824 1.83018 10.2568 2.11941 10.704 2.47913L9.88734 3.32497ZM11.5207 10.675L10.704 9.8583C10.9568 9.52775 11.1609 9.17045 11.3165 8.78643C11.4721 8.4024 11.579 8.00136 11.6373 7.5833H12.8332C12.7554 8.15691 12.6096 8.70622 12.3957 9.23122C12.1818 9.75622 11.8901 10.2375 11.5207 10.675ZM11.6373 6.41663C11.579 5.99858 11.4721 5.59754 11.3165 5.21351C11.1609 4.82948 10.9568 4.47219 10.704 4.14163L11.5207 3.32497C11.8901 3.76247 12.1866 4.24372 12.4103 4.76872C12.6339 5.29372 12.7748 5.84302 12.8332 6.41663H11.6373Z"
                          fill="currentColor"
                        />
                      </g>
                    </svg>
                  )}
                  {article.milestone}
                </span>
              </td>
              <td className="article-lineup-date">{formatDisplayDateTime(article.estimatedPublication)}</td>
              <td className="article-lineup-date">{formatDisplayDateTime(article.acceptance)}</td>
              <td className="article-lineup-action-cell">
                {action === 'add' ? (
                  <button type="button" className="article-lineup-add-button" onClick={() => toggleArticle(article.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" fill="currentColor" />
                    </svg>
                    Add
                  </button>
                ) : (
                  <button type="button" className="article-lineup-remove-button" onClick={() => toggleArticle(article.id)}>
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="article-lineup-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className={[
          'article-lineup-modal',
          headerAction === 'back' ? 'article-lineup-modal--back-flow' : '',
          isClosing ? 'article-lineup-modal--closing' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-lineup-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className={headerAction === 'back' ? 'article-lineup-header article-lineup-header--back' : 'article-lineup-header'}>
          <div className="article-lineup-header-title">
            {headerAction === 'back' && (
              <button type="button" className="article-lineup-back" onClick={onClose} aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h2 id="article-lineup-title">{title}</h2>
          </div>
          {headerAction === 'close' && (
            <button type="button" className="article-lineup-close" onClick={onClose} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29 1.41 1.41Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </header>

        <div
          className="article-lineup-main"
          style={
            {
              '--article-lineup-bottom-stack-height': showPageBudget ? '112px' : '60px',
            } as CSSProperties
          }
        >
          <div className="article-lineup-body" ref={scrollContainerRef} onScroll={updateFabVisibility}>
          <div className="article-lineup-toolbar">
            <div className="article-lineup-search">
              <input
                type="text"
                placeholder="Search"
                value={articleSearch}
                onChange={event => setArticleSearch(event.target.value)}
                aria-label="Search articles"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" fill="currentColor" />
              </svg>
            </div>

            <div className="article-lineup-filters">
              <div className="article-lineup-filter" ref={milestoneDropdownRef}>
                <button
                  type="button"
                  className="article-lineup-filter-button"
                  aria-expanded={showMilestoneDropdown}
                  onClick={() => setShowMilestoneDropdown(prev => !prev)}
                >
                  <span className="article-lineup-filter-label">Milestone:</span>
                  <span>{milestoneFilter}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 10l5 5 5-5H7Z" fill="currentColor" />
                  </svg>
                </button>
                {showMilestoneDropdown && (
                  <div className="article-lineup-filter-menu" role="listbox">
                    {MILESTONES.map(milestone => {
                      const isSelected = milestone === milestoneFilter;
                      return (
                        <button
                          key={milestone}
                          type="button"
                          className={`article-lineup-filter-option${isSelected ? ' article-lineup-filter-option--selected' : ''}`}
                          onClick={() => {
                            setMilestoneFilter(milestone);
                            setShowMilestoneDropdown(false);
                          }}
                        >
                          <span className="article-lineup-filter-check" aria-hidden>
                            {isSelected && (
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7.5 10.5 9.5 12.5 13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span>{milestone}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="article-lineup-filter" ref={sortDropdownRef}>
                <button
                  type="button"
                  className="article-lineup-filter-button"
                  aria-expanded={showSortDropdown}
                  onClick={() => setShowSortDropdown(prev => !prev)}
                >
                  <span className="article-lineup-filter-label">Sort by:</span>
                  <span>{sortLabel}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 10l5 5 5-5H7Z" fill="currentColor" />
                  </svg>
                </button>
                {showSortDropdown && (
                  <div className="article-lineup-filter-menu article-lineup-filter-menu--right" role="listbox">
                    {SORT_OPTIONS.map(option => {
                      const isSelected = option.value === sortBy;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`article-lineup-filter-option${isSelected ? ' article-lineup-filter-option--selected' : ''}`}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                        >
                          <span className="article-lineup-filter-check" aria-hidden>
                            {isSelected && (
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7.5 10.5 9.5 12.5 13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {unassignedArticles.length > 0 && (
            <section className="article-lineup-section" aria-labelledby="available-articles-heading">
              <h3 id="available-articles-heading" className="article-lineup-section-title">
                Available Articles ({visibleAvailableArticles.length})
              </h3>
              {visibleAvailableArticles.length > 0
                ? renderArticleTable(visibleAvailableArticles, 'add')
                : renderEmptyState('Nothing matches your search or milestone filter. Clear the filter to see all available articles.')}
            </section>
          )}

          {selectedArticles.length > 0 && (
            <section
              className="article-lineup-section article-lineup-assigned-section"
              aria-labelledby="assigned-articles-heading"
              ref={assignedSectionRef}
            >
              <h3 id="assigned-articles-heading" className="article-lineup-section-title">
                Assigned Articles ({visibleAssignedArticles.length})
              </h3>
              {visibleAssignedArticles.length > 0
                ? renderArticleTable(visibleAssignedArticles, 'remove')
                : renderEmptyState('No assigned articles match your search or milestone filter. Clear the filter to see them again.')}
            </section>
          )}
          </div>

          {showGoDownFab && (
          <button type="button" className="article-lineup-fab" onClick={scrollToAssigned}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" fill="currentColor" />
            </svg>
            View Assigned Articles ({selectedArticles.length})
          </button>
          )}

          {showGoUpFab && unassignedArticles.length > 0 && (
          <button type="button" className="article-lineup-fab" onClick={scrollToTop}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill="currentColor" />
            </svg>
            Back to top
          </button>
          )}

          <div className="article-lineup-bottom-stack">
          {showPageBudget && (
            <div
              className="article-lineup-page-budget-bar"
              role="status"
              aria-live={pageBudgetExceeded ? 'polite' : undefined}
              aria-label={`Page budget: ${pagesRemaining} pages remaining, ${pagesAdded} pages added, ${PAGE_BUDGET} issue budget`}
            >
              <div className="article-lineup-page-budget-left">
                <span className="article-lineup-page-budget-title">Page Budget</span>
                <span className="article-lineup-page-budget-info-wrap">
                  <span
                    className="article-lineup-page-budget-info-trigger"
                    tabIndex={0}
                    aria-describedby="article-lineup-budget-tooltip-desc"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <mask id="articleLineupPageBudgetInfoMask" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                        <rect width="16" height="16" fill="#D9D9D9" />
                      </mask>
                      <g mask="url(#articleLineupPageBudgetInfoMask)">
                        <path
                          d="M7.33325 11.3334H8.66658V7.33337H7.33325V11.3334ZM8.47492 5.80837C8.6027 5.6806 8.66658 5.52226 8.66658 5.33337C8.66658 5.14448 8.6027 4.98615 8.47492 4.85837C8.34714 4.7306 8.18881 4.66671 7.99992 4.66671C7.81103 4.66671 7.6527 4.7306 7.52492 4.85837C7.39714 4.98615 7.33325 5.14448 7.33325 5.33337C7.33325 5.52226 7.39714 5.6806 7.52492 5.80837C7.6527 5.93615 7.81103 6.00004 7.99992 6.00004C8.18881 6.00004 8.34714 5.93615 8.47492 5.80837ZM7.99992 14.6667C7.0777 14.6667 6.21103 14.4917 5.39992 14.1417C4.58881 13.7917 3.88325 13.3167 3.28325 12.7167C2.68325 12.1167 2.20825 11.4112 1.85825 10.6C1.50825 9.78893 1.33325 8.92226 1.33325 8.00004C1.33325 7.07782 1.50825 6.21115 1.85825 5.40004C2.20825 4.58893 2.68325 3.88337 3.28325 3.28337C3.88325 2.68337 4.58881 2.20837 5.39992 1.85837C6.21103 1.50837 7.0777 1.33337 7.99992 1.33337C8.92214 1.33337 9.78881 1.50837 10.5999 1.85837C11.411 2.20837 12.1166 2.68337 12.7166 3.28337C13.3166 3.88337 13.7916 4.58893 14.1416 5.40004C14.4916 6.21115 14.6666 7.07782 14.6666 8.00004C14.6666 8.92226 14.4916 9.78893 14.1416 10.6C13.7916 11.4112 13.3166 12.1167 12.7166 12.7167C12.1166 13.3167 11.411 13.7917 10.5999 14.1417C9.78881 14.4917 8.92214 14.6667 7.99992 14.6667ZM7.99992 13.3334C9.48881 13.3334 10.7499 12.8167 11.7833 11.7834C12.8166 10.75 13.3333 9.48893 13.3333 8.00004C13.3333 6.51115 12.8166 5.25004 11.7833 4.21671C10.7499 3.18337 9.48881 2.66671 7.99992 2.66671C6.51103 2.66671 5.24992 3.18337 4.21659 4.21671C3.18325 5.25004 2.66659 6.51115 2.66659 8.00004C2.66659 9.48893 3.18325 10.75 4.21659 11.7834C5.24992 12.8167 6.51103 13.3334 7.99992 13.3334Z"
                          fill="#868E94"
                        />
                      </g>
                    </svg>
                  </span>
                  <span id="article-lineup-budget-tooltip-desc" role="tooltip" className="article-lineup-page-budget-tooltip">
                    <span className="article-lineup-page-budget-tooltip-heading">Annual Page Budget</span>
                    <div className="article-lineup-page-budget-tooltip-rows">
                      <div className="article-lineup-page-budget-tooltip-row">
                        <span className="article-lineup-page-budget-tooltip-k">Total Issues / Year</span>
                        <span className="article-lineup-page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.totalIssuesPerYear}</span>
                      </div>
                      <div className="article-lineup-page-budget-tooltip-row">
                        <span className="article-lineup-page-budget-tooltip-k">Per-Issue Budget</span>
                        <span className="article-lineup-page-budget-tooltip-v">{PAGE_BUDGET} pages</span>
                      </div>
                    </div>
                    <div className="article-lineup-page-budget-tooltip-divider" aria-hidden />
                    <div className="article-lineup-page-budget-tooltip-rows">
                      <div className="article-lineup-page-budget-tooltip-row">
                        <span className="article-lineup-page-budget-tooltip-k">Total Annual Allocation</span>
                        <span className="article-lineup-page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.totalAnnualAllocationPages} pages</span>
                      </div>
                      <div className="article-lineup-page-budget-tooltip-row">
                        <span className="article-lineup-page-budget-tooltip-k">Pages Used Till Date</span>
                        <span className="article-lineup-page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.pagesUsedTillDatePages} pages</span>
                      </div>
                      <div className="article-lineup-page-budget-tooltip-row">
                        <span className="article-lineup-page-budget-tooltip-k">Remaining for the Year</span>
                        <span className="article-lineup-page-budget-tooltip-v">{ANNUAL_PAGE_BUDGET_TOOLTIP.remainingForYearPages} pages</span>
                      </div>
                    </div>
                  </span>
                </span>
              </div>
              <div className="article-lineup-page-budget-right">
                <div className="article-lineup-budget-stat">
                  <span className={`article-lineup-budget-number${pageBudgetExceeded ? ' article-lineup-budget-number--warning' : ''}`}>
                    {pagesRemaining}
                  </span>
                  <span className="article-lineup-budget-label">Pages remaining</span>
                </div>
                <div className="article-lineup-budget-divider" aria-hidden />
                <div className="article-lineup-budget-stat">
                  <span className={`article-lineup-budget-number${pageBudgetExceeded ? ' article-lineup-budget-number--warning' : ''}`}>
                    {pagesAdded}
                  </span>
                  <span className="article-lineup-budget-label">Pages added</span>
                </div>
                <div className="article-lineup-budget-divider" aria-hidden />
                <div className="article-lineup-budget-stat">
                  <span className="article-lineup-budget-number">{PAGE_BUDGET}</span>
                  <span className="article-lineup-budget-label">Issue budget</span>
                </div>
              </div>
            </div>
          )}
            <div className="article-lineup-footer-actions">
              <button
                type="button"
                className="article-lineup-confirm"
                onClick={handleConfirm}
                disabled={!hasAssignedArticles}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ArticleLineupModal;
