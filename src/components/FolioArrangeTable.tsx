import { Fragment, useMemo, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import type { Identifier } from 'dnd-core';
import { useDrag, useDrop } from 'react-dnd';
import type { Article } from '../data/articles';
import type { FolioArrangementItem, FolioMatterType } from '../types/issue';
import { formatDisplayDateTime } from '../utils/dateFormat';
import FolioArrangeGapSuggestion from './FolioArrangeGapSuggestion';
import { getFolioItemPageDisplay } from '../utils/folioPageRanges';
import {
  getFolioPageGapSuggestions,
  type FolioPageGapSuggestion,
} from '../utils/folioPageGapSuggestions';

const FOLIO_ROW_DND_TYPE = 'folio-arrange-row';

export const FOLIO_MATTER_LABELS: Record<FolioMatterType, { label: string; category: string }> = {
  coversheet: { label: 'Coversheet', category: 'Front Matter' },
  masthead: { label: 'Mast Head', category: 'Front Matter' },
  'table-of-contents': { label: 'Table of Contents', category: 'Front Matter' },
  'call-for-papers': { label: 'Call for Papers', category: 'Front Matter' },
  advertisement: { label: 'Advertisements', category: 'Back Matter' },
  'upcoming-issue': { label: 'Upcoming Issue', category: 'Back Matter' },
  blank: { label: 'Blank', category: 'Separator' },
};

export const FOLIO_REQUIRED_FILE_TYPES: FolioMatterType[] = [
  'masthead',
  'call-for-papers',
  'advertisement',
  'upcoming-issue',
];

export const requiresFolioFile = (matterType: FolioMatterType): boolean =>
  FOLIO_REQUIRED_FILE_TYPES.includes(matterType);

export const isRemovableMatter = (matterType: FolioMatterType): boolean => matterType === 'blank';

const getMilestoneBadgeClass = (variant: Article['milestoneVariant']) =>
  variant === 'paused'
    ? 'folio-arrange-milestone folio-arrange-milestone--paused'
    : 'folio-arrange-milestone folio-arrange-milestone--inprogress';

const renderMilestoneIcon = (variant: Article['milestoneVariant']) =>
  variant === 'paused' ? (
    <svg className="folio-arrange-milestone-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 19h4V5H6v14Zm8-14v14h4V5h-4Z" fill="currentColor" />
    </svg>
  ) : (
    <svg className="folio-arrange-milestone-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.479 10.675C2.10956 10.2375 1.81303 9.75622 1.58942 9.23122C1.36581 8.70622 1.22484 8.15691 1.1665 7.5833H2.36234C2.42067 8.00136 2.52762 8.4024 2.68317 8.78643C2.83873 9.17045 3.04289 9.52775 3.29567 9.8583L2.479 10.675ZM1.1665 6.41663C1.24428 5.84302 1.39012 5.29372 1.604 4.76872C1.81789 4.24372 2.10956 3.76247 2.479 3.32497L3.29567 4.14163C3.04289 4.47219 2.83873 4.82948 2.68317 5.21351C2.52762 5.59754 2.42067 5.99858 2.36234 6.41663H1.1665ZM6.38734 12.8041C5.81373 12.7458 5.26685 12.6073 4.74671 12.3885C4.22657 12.1698 3.74289 11.8805 3.29567 11.5208L4.11234 10.675C4.45262 10.9277 4.81234 11.1368 5.1915 11.3021C5.57067 11.4673 5.96928 11.5791 6.38734 11.6375V12.8041ZM4.1415 3.32497L3.29567 2.47913C3.75262 2.11941 4.24359 1.83018 4.76859 1.61143C5.29359 1.39268 5.84289 1.25413 6.4165 1.1958V2.36247C5.99845 2.4208 5.59741 2.53261 5.21338 2.69788C4.82935 2.86316 4.47206 3.07219 4.1415 3.32497ZM7.554 12.8041V11.6375C7.98178 11.5791 8.38769 11.4698 8.77171 11.3093C9.15574 11.1489 9.51789 10.9375 9.85817 10.675L10.704 11.5208C10.2471 11.8902 9.75366 12.1819 9.2238 12.3958C8.69393 12.6097 8.13734 12.7458 7.554 12.8041ZM9.88734 3.32497C9.54706 3.07219 9.18248 2.86316 8.79359 2.69788C8.4047 2.53261 8.00123 2.4208 7.58317 2.36247V1.1958C8.15678 1.25413 8.70852 1.39268 9.23838 1.61143C9.76824 1.83018 10.2568 2.11941 10.704 2.47913L9.88734 3.32497ZM11.5207 10.675L10.704 9.8583C10.9568 9.52775 11.1609 9.17045 11.3165 8.78643C11.4721 8.4024 11.579 8.00136 11.6373 7.5833H12.8332C12.7554 8.15691 12.6096 8.70622 12.3957 9.23122C12.1818 9.75622 11.8901 10.2375 11.5207 10.675ZM11.6373 6.41663C11.579 5.99858 11.4721 5.59754 11.3165 5.21351C11.1609 4.82948 10.9568 4.47219 10.704 4.14163L11.5207 3.32497C11.8901 3.76247 12.1866 4.24372 12.4103 4.76872C12.6339 5.29372 12.7748 5.84302 12.8332 6.41663H11.6373Z"
        fill="currentColor"
      />
    </svg>
  );

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getArticleCategory = (article: Article): string =>
  article.type === 'Research' ? 'Research Article' : article.type;

interface DragRow {
  id: string;
  index: number;
}

interface FolioArrangeRowHandlers {
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (itemId: string) => void;
  onFileChange: (itemId: string, file: File) => void;
  onRemoveFile: (itemId: string) => void;
  onOpenAddItemModal: (insertAfterIndex?: number) => void;
  onAddArticleFromAvailableAfter: (index: number) => void;
  onAddNewArticleAfter: (index: number) => void;
}

interface FolioArrangeTableProps extends FolioArrangeRowHandlers {
  items: FolioArrangementItem[];
  articlesById: Record<string, Article>;
  dismissedGapSuggestionIds: ReadonlySet<string>;
  onAcceptGapSuggestion: (suggestion: FolioPageGapSuggestion) => void;
  onRejectGapSuggestion: (suggestion: FolioPageGapSuggestion) => void;
}

interface FolioArrangeRowProps extends FolioArrangeRowHandlers {
  items: FolioArrangementItem[];
  articlesById: Record<string, Article>;
  item: FolioArrangementItem;
  index: number;
}

const FolioArrangeRow = ({
  item,
  index,
  items,
  articlesById,
  onMoveItem,
  onRemoveItem,
  onFileChange,
  onRemoveFile,
  onOpenAddItemModal,
  onAddArticleFromAvailableAfter,
  onAddNewArticleAfter,
}: FolioArrangeRowProps) => {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const dragHandleRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowAddMenuRef = useRef<HTMLDivElement>(null);
  const [sequenceValue, setSequenceValue] = useState(String(index + 1));
  const [isRowAddMenuOpen, setIsRowAddMenuOpen] = useState(false);

  const [{ handlerId }, drop] = useDrop<DragRow, void, { handlerId: Identifier | null }>({
    accept: FOLIO_ROW_DND_TYPE,
    collect: monitor => ({
      handlerId: monitor.getHandlerId(),
    }),
    hover: dragged => {
      if (!rowRef.current || dragged.index === index) return;
      onMoveItem(dragged.index, index);
      dragged.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: FOLIO_ROW_DND_TYPE,
    item: { id: item.id, index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drop(rowRef);
  drag(dragHandleRef);

  useEffect(() => {
    setSequenceValue(String(index + 1));
  }, [index]);

  useEffect(() => {
    if (!isRowAddMenuOpen) return;

    const handleDocumentMouseDown = (event: globalThis.MouseEvent) => {
      if (!rowAddMenuRef.current?.contains(event.target as Node)) {
        setIsRowAddMenuOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRowAddMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isRowAddMenuOpen]);

  const article = item.kind === 'article' ? articlesById[item.articleId] : undefined;
  const matter = item.kind === 'matter' ? FOLIO_MATTER_LABELS[item.matterType] : undefined;
  const isBlankMatter = item.kind === 'matter' && item.matterType === 'blank';
  const needsFile = item.kind === 'matter' && requiresFolioFile(item.matterType);
  const { pages: pagesDisplay, pageRange: pageRangeDisplay } = getFolioItemPageDisplay(item, articlesById);
  const rowClassName = [
    'folio-arrange-row',
    isDragging ? 'folio-arrange-row--dragging' : '',
    item.kind === 'matter' && needsFile && !item.file ? 'folio-arrange-row--needs-file' : '',
  ].filter(Boolean).join(' ');

  const handleInputFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileChange(item.id, file);
    event.target.value = '';
  };

  const handleDropFile = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onFileChange(item.id, file);
  };

  const handleOpenUploadedFile = () => {
    if (item.kind !== 'matter' || !item.file?.objectUrl) return;
    window.open(item.file.objectUrl, '_blank', 'noopener,noreferrer');
  };

  const commitSequenceChange = () => {
    const parsed = Number(sequenceValue);
    if (!Number.isInteger(parsed)) {
      setSequenceValue(String(index + 1));
      return;
    }

    const toIndex = Math.min(Math.max(parsed, 1), items.length) - 1;
    setSequenceValue(String(toIndex + 1));
    if (toIndex !== index) {
      onMoveItem(index, toIndex);
    }
  };

  const handleSequenceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      setSequenceValue(String(index + 1));
      event.currentTarget.blur();
    }
  };

  const renderFileUpload = () => {
    if (item.kind !== 'matter' || item.matterType === 'blank') {
      return <span className="folio-arrange-muted">No file needed</span>;
    }

    if (item.file) {
      const canOpenFile = Boolean(item.file.objectUrl);

      return (
        <div className="folio-arrange-file-card">
          <div className="folio-arrange-file-card-header">
            <button
              type="button"
              className="folio-arrange-file-name"
              aria-label={`Open ${item.file.name} in a new tab`}
              title={canOpenFile ? `Open ${item.file.name} in a new tab` : 'File preview is unavailable'}
              disabled={!canOpenFile}
              onClick={handleOpenUploadedFile}
            >
              {item.file.name}
            </button>
            <div className="folio-arrange-file-actions" aria-label="File actions">
              <button
                type="button"
                className="folio-arrange-file-action"
                aria-label={`Open ${item.file.name} in a new tab`}
                disabled={!canOpenFile}
                onClick={handleOpenUploadedFile}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2.5v7m0 0 2.75-2.75M8 9.5 5.25 6.75M4 13.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="folio-arrange-file-action folio-arrange-file-action--delete"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => onRemoveFile(item.id)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
          <span className="folio-arrange-file-meta">
            {formatFileSize(item.file.size)} . {formatDisplayDateTime(item.file.uploadedAt)} . Uploaded by {item.file.uploadedBy}
          </span>
        </div>
      );
    }

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".doc,.docx,.pdf,.xls,.xlsx"
          className="folio-arrange-file-input"
          onChange={handleInputFile}
        />
        <button
          type="button"
          className="folio-arrange-upload"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={handleDropFile}
        >
          <span className="folio-arrange-upload-main">
            <span className="folio-arrange-upload-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 13.33V4.17m0 0L6.67 7.5M10 4.17l3.33 3.33M5 15.83h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              Drag and drop file or <u>Browse</u>
              {needsFile && <em className="folio-arrange-upload-required" aria-hidden> *</em>}
            </span>
          </span>
          <small>DOCX, PDF, or XLSX. Max. file size: 10 MB.</small>
        </button>
      </>
    );
  };

  return (
    <tr ref={rowRef} className={rowClassName} data-handler-id={handlerId ?? undefined}>
      <td className="folio-arrange-sequence">
        <div
          className={`folio-arrange-sequence-inner${isRowAddMenuOpen ? ' folio-arrange-sequence-inner--menu-open' : ''}`}
          ref={rowAddMenuRef}
        >
          <button
            type="button"
            className="folio-arrange-add-row"
            aria-label={`Add after row ${index + 1}`}
            aria-haspopup="menu"
            aria-expanded={isRowAddMenuOpen}
            aria-controls={isRowAddMenuOpen ? `folio-arrange-row-add-menu-${item.id}` : undefined}
            onClick={() => setIsRowAddMenuOpen(prev => !prev)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          {isRowAddMenuOpen && (
            <div id={`folio-arrange-row-add-menu-${item.id}`} className="folio-arrange-row-add-menu" role="menu">
              <button
                type="button"
                className="folio-arrange-row-add-menu-item"
                role="menuitem"
                onClick={() => {
                  onOpenAddItemModal(index);
                  setIsRowAddMenuOpen(false);
                }}
              >
                Add Item
              </button>
              <button
                type="button"
                className="folio-arrange-row-add-menu-item"
                role="menuitem"
                onClick={() => {
                  onAddArticleFromAvailableAfter(index);
                  setIsRowAddMenuOpen(false);
                }}
              >
                Add from available article
              </button>
              <button
                type="button"
                className="folio-arrange-row-add-menu-item"
                role="menuitem"
                onClick={() => {
                  onAddNewArticleAfter(index);
                  setIsRowAddMenuOpen(false);
                }}
              >
                Add new article
              </button>
            </div>
          )}
          <span ref={dragHandleRef} className="folio-arrange-drag-handle" aria-label="Drag row">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="5" cy="3.5" r="1.1" fill="currentColor" />
              <circle cx="11" cy="3.5" r="1.1" fill="currentColor" />
              <circle cx="5" cy="8" r="1.1" fill="currentColor" />
              <circle cx="11" cy="8" r="1.1" fill="currentColor" />
              <circle cx="5" cy="12.5" r="1.1" fill="currentColor" />
              <circle cx="11" cy="12.5" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <input
            className="folio-arrange-sequence-input"
            type="number"
            min="1"
            max={items.length}
            value={sequenceValue}
            aria-label={`Sequence for row ${index + 1}`}
            onChange={event => setSequenceValue(event.target.value)}
            onBlur={commitSequenceChange}
            onKeyDown={handleSequenceKeyDown}
          />
        </div>
      </td>
      <td className="folio-arrange-category-cell">
        <div className="folio-arrange-category-inner">
          {item.kind === 'article' && article ? (
            <>
              <strong className="folio-arrange-link">{article.id}</strong>
              <span className="folio-arrange-muted">{getArticleCategory(article)}</span>
            </>
          ) : (
            <>
              <strong>
                {matter?.label}
                {needsFile && <span className="folio-arrange-required"> *</span>}
              </strong>
            </>
          )}
        </div>
      </td>
      <td className="folio-arrange-content-cell">
        {item.kind === 'article' && article ? (
          <div className="folio-arrange-article-content">
            <div className="folio-arrange-article-title">
              <span>{article.title}</span>
              <span className="folio-arrange-doi">
                <button type="button" className="doi-icon-btn" aria-label={`DOI: ${article.doi}`}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M5.41659 14.1417C4.60547 13.7917 3.89714 13.3139 3.29159 12.7083C2.68603 12.1028 2.20825 11.3945 1.85825 10.5833C1.50825 9.77223 1.33325 8.90834 1.33325 7.99168C1.33325 7.07501 1.50825 6.2139 1.85825 5.40834C2.20825 4.60279 2.68603 3.89723 3.29159 3.29168C3.89714 2.68612 4.60547 2.20834 5.41659 1.85834C6.2277 1.50834 7.09158 1.33334 8.00825 1.33334C8.92492 1.33334 9.78603 1.50834 10.5916 1.85834C11.3971 2.20834 12.1027 2.68612 12.7083 3.29168C13.3138 3.89723 13.7916 4.60279 14.1416 5.40834C14.4916 6.2139 14.6666 7.07501 14.6666 7.99168C14.6666 8.90834 14.4916 9.77223 14.1416 10.5833C13.7916 11.3945 13.3138 12.1028 12.7083 12.7083C12.1027 13.3139 11.3971 13.7917 10.5916 14.1417C9.78603 14.4917 8.92492 14.6667 8.00825 14.6667C7.09158 14.6667 6.2277 14.4917 5.41659 14.1417ZM7.99992 13.3C8.28881 12.9 8.53881 12.4833 8.74992 12.05C8.96103 11.6167 9.13325 11.1556 9.26659 10.6667H6.73325C6.86659 11.1556 7.03881 11.6167 7.24992 12.05C7.46103 12.4833 7.71103 12.9 7.99992 13.3ZM6.26659 13.0333C6.06659 12.6667 5.89159 12.2861 5.74159 11.8917C5.59159 11.4972 5.46659 11.0889 5.36659 10.6667H3.39992C3.72214 11.2222 4.12492 11.7056 4.60825 12.1167C5.09159 12.5278 5.64436 12.8333 6.26659 13.0333ZM9.73325 13.0333C10.3555 12.8333 10.9083 12.5278 11.3916 12.1167C11.8749 11.7056 12.2777 11.2222 12.5999 10.6667H10.6333C10.5333 11.0889 10.4083 11.4972 10.2583 11.8917C10.1083 12.2861 9.93325 12.6667 9.73325 13.0333ZM2.83325 9.33334H5.09992C5.06659 9.11112 5.04159 8.89168 5.02492 8.67501C5.00825 8.45834 4.99992 8.23334 4.99992 8.00001C4.99992 7.76668 5.00825 7.54168 5.02492 7.32501C5.04159 7.10834 5.06659 6.8889 5.09992 6.66668H2.83325C2.7777 6.8889 2.73603 7.10834 2.70825 7.32501C2.68047 7.54168 2.66659 7.76668 2.66659 8.00001C2.66659 8.23334 2.68047 8.45834 2.70825 8.67501C2.73603 8.89168 2.7777 9.11112 2.83325 9.33334ZM6.43325 9.33334H9.56659C9.59992 9.11112 9.62492 8.89168 9.64159 8.67501C9.65825 8.45834 9.66658 8.23334 9.66658 8.00001C9.66658 7.76668 9.65825 7.54168 9.64159 7.32501C9.62492 7.10834 9.59992 6.8889 9.56659 6.66668H6.43325C6.39992 6.8889 6.37492 7.10834 6.35825 7.32501C6.34158 7.54168 6.33325 7.76668 6.33325 8.00001C6.33325 8.23334 6.34158 8.45834 6.35825 8.67501C6.37492 8.89168 6.39992 9.11112 6.43325 9.33334ZM10.8999 9.33334H13.1666C13.2221 9.11112 13.2638 8.89168 13.2916 8.67501C13.3194 8.45834 13.3333 8.23334 13.3333 8.00001C13.3333 7.76668 13.3194 7.54168 13.2916 7.32501C13.2638 7.10834 13.2221 6.8889 13.1666 6.66668H10.8999C10.9333 6.8889 10.9583 7.10834 10.9749 7.32501C10.9916 7.54168 10.9999 7.76668 10.9999 8.00001C10.9999 8.23334 10.9916 8.45834 10.9749 8.67501C10.9583 8.89168 10.9333 9.11112 10.8999 9.33334ZM10.6333 5.33334H12.5999C12.2777 4.77779 11.8749 4.29445 11.3916 3.88334C10.9083 3.47223 10.3555 3.16668 9.73325 2.96668C9.93325 3.33334 10.1083 3.7139 10.2583 4.10834C10.4083 4.50279 10.5333 4.91112 10.6333 5.33334ZM6.73325 5.33334H9.26659C9.13325 4.84445 8.96103 4.38334 8.74992 3.95001C8.53881 3.51668 8.28881 3.10001 7.99992 2.70001C7.71103 3.10001 7.46103 3.51668 7.24992 3.95001C7.03881 4.38334 6.86659 4.84445 6.73325 5.33334ZM3.39992 5.33334H5.36659C5.46659 4.91112 5.59159 4.50279 5.74159 4.10834C5.89159 3.7139 6.06659 3.33334 6.26659 2.96668C5.64436 3.16668 5.09159 3.47223 4.60825 3.88334C4.12492 4.29445 3.72214 4.77779 3.39992 5.33334Z" fill="currentColor" />
                  </svg>
                </button>
                <span className="folio-arrange-doi-tooltip">
                  <span className="folio-arrange-doi-tooltip-label">DOI</span>
                  <span className="folio-arrange-doi-number">{article.doi}</span>
                </span>
              </span>
            </div>
            <span className={getMilestoneBadgeClass(article.milestoneVariant)}>
              {renderMilestoneIcon(article.milestoneVariant)}
              {article.milestone}
            </span>
            <div className="folio-arrange-article-meta">
              <span>Author: <strong>{article.author}</strong></span>
              <span>Est. Publication: <strong>{formatDisplayDateTime(article.estimatedPublication)}</strong></span>
            </div>
          </div>
        ) : isBlankMatter ? (
          null
        ) : (
          renderFileUpload()
        )}
      </td>
      <td>{pagesDisplay ?? null}</td>
      <td>{pageRangeDisplay ?? null}</td>
      <td className="folio-arrange-actions">
        {item.kind === 'article' && (
          <button type="button" className="folio-arrange-remove" onClick={() => onRemoveItem(item.id)}>
            Remove
          </button>
        )}
        {item.kind === 'matter' && isRemovableMatter(item.matterType) && (
          <button type="button" className="folio-arrange-remove" onClick={() => onRemoveItem(item.id)}>
            Remove
          </button>
        )}
      </td>
    </tr>
  );
};

const FolioArrangeTable = ({
  dismissedGapSuggestionIds,
  onAcceptGapSuggestion,
  onRejectGapSuggestion,
  ...rowProps
}: FolioArrangeTableProps) => {
  const gapSuggestionsByIndex = useMemo(() => {
    const map = new Map<number, FolioPageGapSuggestion>();
    getFolioPageGapSuggestions(
      rowProps.items,
      rowProps.articlesById,
      dismissedGapSuggestionIds,
    ).forEach(suggestion => {
      map.set(suggestion.insertBeforeIndex, suggestion);
    });
    return map;
  }, [dismissedGapSuggestionIds, rowProps.articlesById, rowProps.items]);

  return (
    <div className="folio-arrange-table-wrap">
      <table className="folio-arrange-table">
        <thead>
          <tr>
            <th>Sequence</th>
            <th>Category</th>
            <th>Content</th>
            <th>Pages</th>
            <th>Page Range</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rowProps.items.map((item, index) => {
            const gapSuggestion = gapSuggestionsByIndex.get(index);
            return (
              <Fragment key={item.id}>
                {gapSuggestion && (
                  <FolioArrangeGapSuggestion
                    suggestion={gapSuggestion}
                    onAccept={onAcceptGapSuggestion}
                    onReject={onRejectGapSuggestion}
                  />
                )}
                <FolioArrangeRow {...rowProps} item={item} index={index} />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FolioArrangeTable;
