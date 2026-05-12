import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { ARTICLES_BY_JOURNAL, type Article } from '../data/articles';
import type { FolioArrangementItem, FolioFileAttachment, FolioMatterType, Issue } from '../types/issue';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateFormat';
import { FOLIO_MATTER_LABELS } from './FolioArrangeTable';
import './FolioReviewModal.css';

interface FolioReviewModalProps {
  isOpen: boolean;
  issue: Issue | null;
  onClose: () => void;
  onApprove?: () => void;
  onCorrectionSubmit?: () => void;
}

interface ReviewFile {
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ReviewRow {
  id: string;
  sequence: number;
  inToc: boolean;
  categoryName: string;
  categoryType: string;
  article?: Article;
  file: ReviewFile;
  pages: number;
  pageRange: string;
}

const TNQ_USER_NAME = 'TNQ';

const DEFAULT_MATTER_PAGE_COUNTS: Record<FolioMatterType, number> = {
  coversheet: 1,
  masthead: 1,
  'table-of-contents': 1,
  'call-for-papers': 1,
  advertisement: 1,
  'upcoming-issue': 1,
  blank: 1,
};

const ISSUE_TYPE_LABEL: Record<Issue['issueType'], string> = {
  regular: 'Regular',
  special: 'Special',
};

const OUTPUT_FORMAT_LABEL: Record<Issue['outputFormat'], string> = {
  print: 'Print',
  online: 'Online',
  both: 'Print & Online',
};

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getArticleCategory = (article: Article): string =>
  article.type === 'Research' ? 'Research Article' : article.type;

const sanitizeFilePart = (value: string): string =>
  value.trim().replace(/[^a-z0-9-]+/gi, '_').replace(/^_+|_+$/g, '') || 'folio';

const getGeneratedFileName = (issue: Issue, item: FolioArrangementItem, article?: Article): string => {
  if (item.kind === 'article') {
    return `${article?.id ?? item.articleId}.pdf`;
  }

  const matterLabel = FOLIO_MATTER_LABELS[item.matterType].label;
  return `${sanitizeFilePart(issue.journalAcronym)}_${sanitizeFilePart(matterLabel)}.pdf`;
};

const buildReviewFile = (
  issue: Issue,
  item: FolioArrangementItem,
  article?: Article,
  file?: FolioFileAttachment,
): ReviewFile => ({
  name: file?.name ?? getGeneratedFileName(issue, item, article),
  sizeLabel: file ? formatFileSize(file.size) : '313 KB',
  uploadedAt: file?.uploadedAt ?? issue.folioPreparationConfirmedAt ?? issue.folioArrangementConfirmedAt ?? issue.createdAt,
  uploadedBy: file?.uploadedBy ?? TNQ_USER_NAME,
});

const getOutputFileName = (issue: Issue): string =>
  `${sanitizeFilePart(issue.journalAcronym)}_${sanitizeFilePart(issue.volume)}_${sanitizeFilePart(issue.issue)}.pdf`;

const buildReviewRows = (issue: Issue): ReviewRow[] => {
  const articlesById = (ARTICLES_BY_JOURNAL[issue.journalId] ?? []).reduce<Record<string, Article>>((acc, article) => {
    acc[article.id] = article;
    return acc;
  }, {});
  let nextPage = 1;

  return (issue.folioArrangement?.items ?? []).map((item, index) => {
    const article = item.kind === 'article' ? articlesById[item.articleId] : undefined;
    const matter = item.kind === 'matter' ? FOLIO_MATTER_LABELS[item.matterType] : undefined;
    const pages = item.kind === 'article'
      ? article?.pages ?? Math.max(1, item.endPage - item.startPage + 1)
      : item.file?.pageCount ?? DEFAULT_MATTER_PAGE_COUNTS[item.matterType];
    const startPage = nextPage;
    const endPage = startPage + pages - 1;
    nextPage = endPage + 1;

    return {
      id: item.id,
      sequence: index + 1,
      inToc: item.kind === 'article',
      categoryName: article?.id ?? matter?.label ?? 'Item',
      categoryType: article ? getArticleCategory(article) : matter?.category ?? 'Folio Item',
      article,
      file: buildReviewFile(issue, item, article, item.kind === 'matter' ? item.file : undefined),
      pages,
      pageRange: `${startPage}-${endPage}`,
    };
  });
};

const DoiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M5.41732 14.1416C4.60621 13.7916 3.89787 13.3138 3.29232 12.7083C2.68676 12.1027 2.20898 11.3944 1.85898 10.5833C1.50898 9.77214 1.33398 8.90825 1.33398 7.99159C1.33398 7.07492 1.50898 6.21381 1.85898 5.40825C2.20898 4.6027 2.68676 3.89714 3.29232 3.29159C3.89787 2.68603 4.60621 2.20825 5.41732 1.85825C6.22843 1.50825 7.09232 1.33325 8.00898 1.33325C8.92565 1.33325 9.78676 1.50825 10.5923 1.85825C11.3979 2.20825 12.1034 2.68603 12.709 3.29159C13.3145 3.89714 13.7923 4.6027 14.1423 5.40825C14.4923 6.21381 14.6673 7.07492 14.6673 7.99159C14.6673 8.90825 14.4923 9.77214 14.1423 10.5833C13.7923 11.3944 13.3145 12.1027 12.709 12.7083C12.1034 13.3138 11.3979 13.7916 10.5923 14.1416C9.78676 14.4916 8.92565 14.6666 8.00898 14.6666C7.09232 14.6666 6.22843 14.4916 5.41732 14.1416ZM8.00065 13.2999C8.28954 12.8999 8.53954 12.4833 8.75065 12.0499C8.96176 11.6166 9.13398 11.1555 9.26732 10.6666H6.73398C6.86732 11.1555 7.03954 11.6166 7.25065 12.0499C7.46176 12.4833 7.71176 12.8999 8.00065 13.2999ZM6.26732 13.0333C6.06732 12.6666 5.89232 12.286 5.74232 11.8916C5.59232 11.4971 5.46732 11.0888 5.36732 10.6666H3.40065C3.72287 11.2221 4.12565 11.7055 4.60898 12.1166C5.09232 12.5277 5.6451 12.8333 6.26732 13.0333ZM9.73398 13.0333C10.3562 12.8333 10.909 12.5277 11.3923 12.1166C11.8757 11.7055 12.2784 11.2221 12.6007 10.6666H10.634C10.534 11.0888 10.409 11.4971 10.259 11.8916C10.109 12.286 9.93398 12.6666 9.73398 13.0333ZM2.83398 9.33325H5.10065C5.06732 9.11103 5.04232 8.89158 5.02565 8.67492C5.00898 8.45825 5.00065 8.23325 5.00065 7.99992C5.00065 7.76658 5.00898 7.54159 5.02565 7.32492C5.04232 7.10825 5.06732 6.88881 5.10065 6.66658H2.83398C2.77843 6.88881 2.73676 7.10825 2.70898 7.32492C2.68121 7.54159 2.66732 7.76658 2.66732 7.99992C2.66732 8.23325 2.68121 8.45825 2.70898 8.67492C2.73676 8.89158 2.77843 9.11103 2.83398 9.33325ZM6.43398 9.33325H9.56732C9.60065 9.11103 9.62565 8.89158 9.64232 8.67492C9.65898 8.45825 9.66732 8.23325 9.66732 7.99992C9.66732 7.76658 9.65898 7.54159 9.64232 7.32492C9.62565 7.10825 9.60065 6.88881 9.56732 6.66658H6.43398C6.40065 6.88881 6.37565 7.10825 6.35898 7.32492C6.34232 7.54159 6.33398 7.76658 6.33398 7.99992C6.33398 8.23325 6.34232 8.45825 6.35898 8.67492C6.37565 8.89158 6.40065 9.11103 6.43398 9.33325ZM10.9007 9.33325H13.1673C13.2229 9.11103 13.2645 8.89158 13.2923 8.67492C13.3201 8.45825 13.334 8.23325 13.334 7.99992C13.334 7.76658 13.3201 7.54159 13.2923 7.32492C13.2645 7.10825 13.2229 6.88881 13.1673 6.66658H10.9007C10.934 6.88881 10.959 7.10825 10.9757 7.32492C10.9923 7.54159 11.0007 7.76658 11.0007 7.99992C11.0007 8.23325 10.9923 8.45825 10.9757 8.67492C10.959 8.89158 10.934 9.11103 10.9007 9.33325ZM10.634 5.33325H12.6007C12.2784 4.7777 11.8757 4.29436 11.3923 3.88325C10.909 3.47214 10.3562 3.16659 9.73398 2.96659C9.93398 3.33325 10.109 3.71381 10.259 4.10825C10.409 4.5027 10.534 4.91103 10.634 5.33325ZM6.73398 5.33325H9.26732C9.13398 4.84436 8.96176 4.38325 8.75065 3.94992C8.53954 3.51659 8.28954 3.09992 8.00065 2.69992C7.71176 3.09992 7.46176 3.51659 7.25065 3.94992C7.03954 4.38325 6.86732 4.84436 6.73398 5.33325ZM3.40065 5.33325H5.36732C5.46732 4.91103 5.59232 4.5027 5.74232 4.10825C5.89232 3.71381 6.06732 3.33325 6.26732 2.96659C5.6451 3.16659 5.09232 3.47214 4.60898 3.88325C4.12565 4.29436 3.72287 4.7777 3.40065 5.33325Z"
      fill="currentColor"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2.5v7m0 0 2.75-2.75M8 9.5 5.25 6.75M4 13.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TocCheckbox = ({ checked, label }: { checked: boolean; label: string }) => (
  <span
    className={checked ? 'folio-review-checkbox folio-review-checkbox--checked' : 'folio-review-checkbox'}
    role="checkbox"
    aria-label={label}
    aria-checked={checked}
    aria-disabled="true"
  >
    {checked && (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 6.1 5.05 8.15 9 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

const PdfIcon = () => (
  <svg className="folio-review-pdf-icon" width="30" height="14" viewBox="0 0 30 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect width="29.3333" height="13.3333" rx="1" fill="#F14848" />
    <path
      d="M7.42347 9.66675V3.84857H9.60529C10.0523 3.84857 10.4273 3.9319 10.7303 4.09857C11.0352 4.26523 11.2653 4.4944 11.4206 4.78607C11.5778 5.07584 11.6564 5.40538 11.6564 5.7747C11.6564 6.14781 11.5778 6.47925 11.4206 6.76902C11.2634 7.05879 11.0314 7.28701 10.7246 7.45368C10.4178 7.61845 10.04 7.70084 9.59109 7.70084H8.14506V6.83436H9.44904C9.7104 6.83436 9.92442 6.78891 10.0911 6.698C10.2578 6.60709 10.3809 6.48209 10.4604 6.323C10.5418 6.16391 10.5826 5.98114 10.5826 5.7747C10.5826 5.56826 10.5418 5.38645 10.4604 5.22925C10.3809 5.07205 10.2568 4.94989 10.0882 4.86277C9.92158 4.77376 9.70662 4.72925 9.44336 4.72925H8.47745V9.66675H7.42347ZM14.5435 9.66675H12.5719V3.84857H14.5833C15.1609 3.84857 15.6571 3.96504 16.0719 4.198C16.4886 4.42906 16.8087 4.76144 17.0321 5.19516C17.2556 5.62887 17.3674 6.14781 17.3674 6.75198C17.3674 7.35804 17.2547 7.87887 17.0293 8.31448C16.8058 8.75008 16.4829 9.08436 16.0605 9.31732C15.6401 9.55027 15.1344 9.66675 14.5435 9.66675ZM13.6259 8.75482H14.4924C14.8977 8.75482 15.2357 8.68095 15.5066 8.53323C15.7774 8.3836 15.981 8.16107 16.1174 7.86561C16.2537 7.56826 16.3219 7.19705 16.3219 6.75198C16.3219 6.3069 16.2537 5.93758 16.1174 5.64402C15.981 5.34857 15.7793 5.12792 15.5123 4.98209C15.2471 4.83436 14.9176 4.7605 14.5236 4.7605H13.6259V8.75482ZM18.3688 9.66675V3.84857H22.0961V4.73209H19.4228V6.31163H21.8404V7.19516H19.4228V9.66675H18.3688Z"
      fill="white"
    />
  </svg>
);

const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

const CorrectionFileIcon = ({ file }: { file: File }) => {
  const extension = getFileExtension(file.name);
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
  const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isPdf = file.type === 'application/pdf' || extension === 'pdf';
  const isDocument = ['doc', 'docx', 'md', 'rtf', 'txt'].includes(extension);
  const tone = isArchive ? '#f6c343' : isImage ? '#58a6ff' : isPdf ? '#f14848' : isDocument ? '#5b7cfa' : '#9aa1a6';
  const label = isArchive ? 'ZIP' : isImage ? 'IMG' : isPdf ? 'PDF' : isDocument ? 'DOC' : 'FILE';

  return (
    <span className="folio-correction-file-icon" style={{ '--correction-file-tone': tone } as CSSProperties} aria-hidden>
      {isArchive ? (
        <svg width="37" height="32" viewBox="0 0 37 32" fill="none">
          <path d="M2 8h13.5l2.8 3H35v16.5A2.5 2.5 0 0 1 32.5 30h-30A2.5 2.5 0 0 1 0 27.5v-17A2.5 2.5 0 0 1 2 8Z" fill="var(--correction-file-tone)" />
          <path d="M2.5 4h11.2l3 3H35v5H0V6.5A2.5 2.5 0 0 1 2.5 4Z" fill="#ffd96b" />
          <path d="M9 12h2v2H9v-2Zm2 2h2v2h-2v-2Zm-2 2h2v2H9v-2Zm2 2h2v2h-2v-2Zm-2 2h2v2H9v-2Zm2 2h2v2h-2v-2Z" fill="#ffffff" opacity="0.8" />
        </svg>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M7 3h12l6 6v20H7V3Z" fill="#ffffff" stroke="var(--correction-file-tone)" strokeWidth="1.5" />
          <path d="M19 3v6h6" stroke="var(--correction-file-tone)" strokeWidth="1.5" />
          <rect x="9.5" y="18" width="13" height="8" rx="1" fill="var(--correction-file-tone)" />
          <text x="16" y="23.7" textAnchor="middle" fill="#ffffff" fontSize="4.5" fontWeight="700">{label}</text>
        </svg>
      )}
    </span>
  );
};

const DownloadIconSmall = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M6 19h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIconSmall = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const FolioReviewModal = ({ isOpen, issue, onClose, onApprove, onCorrectionSubmit }: FolioReviewModalProps) => {
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [correctionUploadedAt, setCorrectionUploadedAt] = useState<string | null>(null);
  const [correctionDescription, setCorrectionDescription] = useState('');
  const correctionFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowCorrectionModal(false);
      setCorrectionFile(null);
      setCorrectionUploadedAt(null);
      setCorrectionDescription('');
    }
  }, [isOpen]);

  if (!isOpen || !issue) return null;

  const rows = buildReviewRows(issue);
  const totalPages = rows.reduce((sum, row) => sum + row.pages, 0);
  const outputFileSize = `${Math.max(1, Math.ceil(totalPages / 8))} MB`;
  const outputTimestamp = issue.folioPreparationConfirmedAt ?? issue.folioArrangementConfirmedAt ?? issue.createdAt;
  const handleCorrectionFile = (file?: File | null) => {
    if (!file) return;
    setCorrectionFile(file);
    setCorrectionUploadedAt(new Date().toISOString());
  };
  const handleCorrectionDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleCorrectionFile(event.dataTransfer.files[0]);
  };
  const handleRemoveCorrectionFile = () => {
    setCorrectionFile(null);
    setCorrectionUploadedAt(null);
    if (correctionFileInputRef.current) {
      correctionFileInputRef.current.value = '';
    }
  };
  const handleCorrectionDone = () => {
    if (!correctionFile) return;
    onCorrectionSubmit?.();
  };

  return createPortal(
    <div className="folio-review-overlay" role="presentation" onMouseDown={onClose}>
      {showCorrectionModal ? (
        <section
          className="folio-correction-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folio-correction-title"
          onMouseDown={event => event.stopPropagation()}
        >
          <header className="folio-correction-header">
            <button
              type="button"
              className="folio-correction-back"
              aria-label="Back to folio review"
              onClick={() => setShowCorrectionModal(false)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M16.67 9.17H6.53l4.65-4.65L10 3.33 3.33 10 10 16.67l1.18-1.18-4.65-4.65h10.14V9.17Z" fill="currentColor" />
              </svg>
            </button>
            <h2 id="folio-correction-title">Upload Folio Correction</h2>
          </header>

          <main className="folio-correction-body">
            <div className="folio-correction-field">
              <label>
                Correction File <span aria-hidden>*</span>
              </label>
              <input
                ref={correctionFileInputRef}
                type="file"
                className="folio-correction-file-input"
                onChange={event => handleCorrectionFile(event.target.files?.[0])}
              />
              {correctionFile ? (
                <div className="folio-correction-attachment-card">
                  <CorrectionFileIcon file={correctionFile} />
                  <div className="folio-correction-attachment-copy">
                    <strong>{correctionFile.name}</strong>
                    <span>
                      {formatFileSize(correctionFile.size)}
                      {correctionUploadedAt ? `. ${formatDisplayDateTime(correctionUploadedAt)}` : ''}
                    </span>
                  </div>
                  <div className="folio-correction-attachment-actions">
                    <button type="button" aria-label={`Download ${correctionFile.name}`}>
                      <DownloadIconSmall />
                    </button>
                    <button type="button" aria-label={`Remove ${correctionFile.name}`} onClick={handleRemoveCorrectionFile}>
                      <CloseIconSmall />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="folio-correction-upload"
                  onClick={() => correctionFileInputRef.current?.click()}
                  onDragOver={event => event.preventDefault()}
                  onDrop={handleCorrectionDrop}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M11 16V7.85L8.4 10.45 7 9l5-5 5 5-1.4 1.45L13 7.85V16h-2Zm-5 4c-.55 0-1.02-.2-1.41-.59A1.92 1.92 0 0 1 4 18v-3h2v3h12v-3h2v3c0 .55-.2 1.02-.59 1.41-.39.39-.86.59-1.41.59H6Z" fill="currentColor" />
                  </svg>
                  <span>Drag and drop file or <u>Browse</u></span>
                </button>
              )}
            </div>

            <div className="folio-correction-field">
              <label htmlFor="folio-correction-description">Description</label>
              <div className="folio-correction-editor">
                <textarea
                  id="folio-correction-description"
                  value={correctionDescription}
                  onChange={event => setCorrectionDescription(event.target.value)}
                  placeholder="Enter Description"
                />
              </div>
            </div>
          </main>

          <footer className="folio-correction-footer">
            <button
              type="button"
              className="folio-correction-done"
              disabled={!correctionFile}
              onClick={handleCorrectionDone}
            >
              Done
            </button>
          </footer>
        </section>
      ) : (
        <section
          className="folio-review-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folio-review-title"
          onMouseDown={event => event.stopPropagation()}
        >
        <header className="folio-review-header">
            <h2 id="folio-review-title">Folio Review</h2>
            <button type="button" className="folio-review-close" aria-label="Close folio review" onClick={onClose}>
            <span aria-hidden>×</span>
          </button>
        </header>

          <main className="folio-review-body">
          <section className="folio-review-section" aria-labelledby="folio-review-issue-details">
            <h3 id="folio-review-issue-details">Issue Details</h3>
            <dl className="folio-review-details-grid">
              <div>
                <dt>Journal</dt>
                <dd>{issue.journalAcronym}</dd>
              </div>
              <div>
                <dt>Vol/Issue</dt>
                <dd>{issue.volume}/{issue.issue}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{ISSUE_TYPE_LABEL[issue.issueType]}</dd>
              </div>
              <div>
                <dt>Cover Month</dt>
                <dd>{issue.coverMonth || '—'}</dd>
              </div>
              <div>
                <dt>Assigned Articles</dt>
                <dd>{issue.assignedArticleIds.length}</dd>
              </div>
              <div>
                <dt>Issue Close Date</dt>
                <dd>{formatDisplayDate(issue.issueCloseDate)}</dd>
              </div>
              <div>
                <dt>Online Pub. Date</dt>
                <dd>{formatDisplayDate(issue.publicationDate)}</dd>
              </div>
              <div>
                <dt>Output Format</dt>
                <dd>{OUTPUT_FORMAT_LABEL[issue.outputFormat]}</dd>
              </div>
            </dl>
          </section>

          <section className="folio-review-section" aria-labelledby="folio-review-output">
            <h3 id="folio-review-output">Output</h3>
            <div className="folio-review-output-card">
              <PdfIcon />
              <div>
                <strong>{getOutputFileName(issue)}</strong>
                <span>{outputFileSize}. {formatDisplayDateTime(outputTimestamp)}</span>
              </div>
              <button type="button" className="folio-review-icon-action" aria-label="Download output file">
                <DownloadIcon />
              </button>
            </div>
          </section>

          <section className="folio-review-section folio-review-section--folio" aria-labelledby="folio-review-folio">
            <h3 id="folio-review-folio">Folio</h3>
            <div className="folio-review-table-wrap">
              <table className="folio-review-table">
                <thead>
                  <tr>
                    <th>Sequence</th>
                    <th>TOC</th>
                    <th>Category</th>
                    <th>Content</th>
                    <th>Pages</th>
                    <th>Page Range</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>{row.sequence}</td>
                      <td>
                        <TocCheckbox checked={row.inToc} label={`${row.categoryName} is ${row.inToc ? '' : 'not '}part of the table of contents`} />
                      </td>
                      <td>
                        <span className={row.article ? 'folio-review-link' : undefined}>{row.categoryName}</span>
                        {row.article && <small>{row.categoryType}</small>}
                      </td>
                      <td>
                        {row.article ? (
                          <div className="folio-review-article-content">
                            <span className="folio-review-article-title">
                              {row.article.title}
                              <DoiIcon />
                            </span>
                            <span className="folio-review-pap-badge">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                                <path d="M2.25 5.1 4.15 7 7.75 3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              PAP
                            </span>
                            <small>Author: {row.article.author}</small>
                            <small>Est. Publication: {formatDisplayDateTime(row.article.estimatedPublication)}</small>
          </div>
                        ) : (
                          <div className="folio-review-file-content">
                            <div>
                              <strong>{row.file.name}</strong>
                              <small>{row.file.sizeLabel}. {formatDisplayDateTime(row.file.uploadedAt)}. Uploaded by {row.file.uploadedBy}</small>
          </div>
                            <button type="button" className="folio-review-icon-action" aria-label={`Download ${row.file.name}`}>
                              <DownloadIcon />
                            </button>
          </div>
                        )}
                      </td>
                      <td>{row.pages}</td>
                      <td>{row.pageRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
          </section>
          </main>

        <footer className="folio-review-footer">
            <button
              type="button"
              className="folio-review-text-button"
              onClick={() => setShowCorrectionModal(true)}
            >
              Upload Correction
          </button>
            <button type="button" className="folio-review-primary" onClick={onApprove ?? onClose}>
            Approve
          </button>
        </footer>
      </section>
      )}
    </div>,
    document.body,
  );
};

export default FolioReviewModal;
