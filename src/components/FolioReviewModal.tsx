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
      d="M5.41659 14.1417C4.60547 13.7917 3.89714 13.3139 3.29159 12.7083C2.68603 12.1028 2.20825 11.3945 1.85825 10.5833C1.50825 9.77223 1.33325 8.90834 1.33325 7.99168C1.33325 7.07501 1.50825 6.2139 1.85825 5.40834C2.20825 4.60279 2.68603 3.89723 3.29159 3.29168C3.89714 2.68612 4.60547 2.20834 5.41659 1.85834C6.2277 1.50834 7.09158 1.33334 8.00825 1.33334C8.92492 1.33334 9.78603 1.50834 10.5916 1.85834C11.3971 2.20834 12.1027 2.68612 12.7083 3.29168C13.3138 3.89723 13.7916 4.60279 14.1416 5.40834C14.4916 6.2139 14.6666 7.07501 14.6666 7.99168C14.6666 8.90834 14.4916 9.77223 14.1416 10.5833C13.7916 11.3945 13.3138 12.1028 12.7083 12.7083C12.1027 13.3139 11.3971 13.7917 10.5916 14.1417C9.78603 14.4917 8.92492 14.6667 8.00825 14.6667C7.09158 14.6667 6.2277 14.4917 5.41659 14.1417Z"
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
