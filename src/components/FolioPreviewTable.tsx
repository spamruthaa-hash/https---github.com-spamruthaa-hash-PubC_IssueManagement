import type { Article } from '../data/articles';
import type { FolioArrangementItem } from '../types/issue';
import { formatDisplayDateTime } from '../utils/dateFormat';
import { getFolioItemPageDisplay } from '../utils/folioPageRanges';
import { FOLIO_MATTER_LABELS } from './FolioArrangeTable';
import './FolioPreviewTable.css';

interface FolioPreviewTableProps {
  items: FolioArrangementItem[];
  articlesById: Record<string, Article>;
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getArticleCategory = (article: Article): string =>
  article.type === 'Research' ? 'Research Article' : article.type;

const DragGlyph = () => (
  <span className="folio-preview-drag" aria-hidden>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="11" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="11" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5" cy="12.5" r="1.1" fill="currentColor" />
      <circle cx="11" cy="12.5" r="1.1" fill="currentColor" />
    </svg>
  </span>
);

const ReadOnlyCheckbox = ({ checked, label }: { checked: boolean; label: string }) => (
  <span
    className={checked ? 'folio-preview-checkbox folio-preview-checkbox--checked' : 'folio-preview-checkbox'}
    role="checkbox"
    aria-checked={checked}
    aria-disabled="true"
    aria-label={label}
  >
    {checked && (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M3 6.1 5.05 8.15 9 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

const FileGlyph = () => (
  <span className="folio-preview-file-glyph" aria-hidden>
    <svg width="32" height="34" viewBox="0 0 32 34" fill="none">
      <rect x="1" y="1" width="26" height="24" rx="2" fill="#f0f1f2" stroke="#e3e4e5" />
      <rect y="20" width="22" height="12" rx="1.5" fill="#f14848" />
      <text x="11" y="29" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700" fontFamily="'Source Sans Pro', sans-serif">
        PDF
      </text>
    </svg>
  </span>
);

const DownloadGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 2.5v7m0 0 2.75-2.75M8 9.5 5.25 6.75M4 13.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DoiGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 1.33A6.67 6.67 0 1 0 8 14.67 6.67 6.67 0 0 0 8 1.33Zm0 1.37c.29.4.54.81.75 1.25.21.43.38.89.52 1.38H6.73c.13-.49.3-.95.52-1.38.21-.44.46-.85.75-1.25ZM6.27 2.97c-.2.36-.38.74-.53 1.14-.15.39-.27.8-.37 1.22H3.4a5.35 5.35 0 0 1 2.87-2.36Zm3.46 0a5.35 5.35 0 0 1 2.87 2.36h-1.97c-.1-.42-.22-.83-.37-1.22-.15-.4-.33-.78-.53-1.14ZM2.83 6.67h2.27c-.04.44-.1.88-.1 1.33 0 .45.06.89.1 1.33H2.83a5.4 5.4 0 0 1 0-2.66Zm3.6 0h3.14c.04.44.1.88.1 1.33 0 .45-.06.89-.1 1.33H6.43c-.04-.44-.1-.88-.1-1.33 0-.45.06-.89.1-1.33Zm4.47 0h2.27a5.4 5.4 0 0 1 0 2.66H10.9c.04-.44.1-.88.1-1.33 0-.45-.06-.89-.1-1.33ZM3.4 10.67h1.97c.1.42.22.83.37 1.22.15.4.33.78.53 1.14a5.35 5.35 0 0 1-2.87-2.36Zm3.33 0h2.54c-.14.49-.31.95-.52 1.38-.21.44-.46.85-.75 1.25-.29-.4-.54-.81-.75-1.25a7.5 7.5 0 0 1-.52-1.38Zm3.9 0h1.97a5.35 5.35 0 0 1-2.87 2.36c.2-.36.38-.74.53-1.14.15-.39.27-.8.37-1.22Z"
      fill="currentColor"
    />
  </svg>
);

const getMilestoneBadgeClass = (variant: Article['milestoneVariant']) =>
  variant === 'paused'
    ? 'folio-preview-milestone folio-preview-milestone--paused'
    : 'folio-preview-milestone folio-preview-milestone--inprogress';

/** Read-only rendering of a folio arrangement, used in the Create Issue review step. */
const FolioPreviewTable = ({ items, articlesById }: FolioPreviewTableProps) => (
  <div className="folio-preview-table-wrap">
    <table className="folio-preview-table">
      <thead>
        <tr>
          <th>Sequence</th>
          <th>Category</th>
          <th>TOC</th>
          <th>Content</th>
          <th>Pages</th>
          <th>Page Range</th>
          <th>Budget</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={7} className="folio-preview-empty">
              No folio items were added.
            </td>
          </tr>
        ) : (
          items.map((item, index) => {
            const article = item.kind === 'article' ? articlesById[item.articleId] : undefined;
            const matter = item.kind === 'matter' ? FOLIO_MATTER_LABELS[item.matterType] : undefined;
            const { pages, pageRange } = getFolioItemPageDisplay(item, articlesById);
            const label = article?.id ?? matter?.label ?? 'Item';
            const inToc = item.kind === 'article';

            return (
              <tr key={item.id}>
                <td className="folio-preview-sequence">
                  <DragGlyph />
                  <span>{index + 1}</span>
                </td>
                <td className="folio-preview-category">
                  {article ? (
                    <>
                      <strong className="folio-preview-link">{article.id}</strong>
                      <span className="folio-preview-muted">{getArticleCategory(article)}</span>
                    </>
                  ) : (
                    <>
                      <strong>{matter?.label}</strong>
                      <span className="folio-preview-muted">{matter?.category}</span>
                    </>
                  )}
                </td>
                <td>
                  <ReadOnlyCheckbox
                    checked={inToc}
                    label={`${label} is ${inToc ? '' : 'not '}part of the table of contents`}
                  />
                </td>
                <td className="folio-preview-content">
                  {article ? (
                    <div className="folio-preview-article">
                      <span className="folio-preview-article-title">
                        <span>{article.title}</span>
                        <span className="folio-preview-doi" title={`DOI: ${article.doi}`}>
                          <DoiGlyph />
                        </span>
                      </span>
                      <span className="folio-preview-article-meta">Author: {article.author}</span>
                      <span className="folio-preview-article-meta">
                        Est. Publication: {formatDisplayDateTime(article.estimatedPublication)}
                      </span>
                      <span className={getMilestoneBadgeClass(article.milestoneVariant)}>{article.milestone}</span>
                    </div>
                  ) : item.kind === 'matter' && item.file ? (
                    <div className="folio-preview-file">
                      <FileGlyph />
                      <span className="folio-preview-file-copy">
                        <span className="folio-preview-file-name">{item.file.name}</span>
                        <span className="folio-preview-file-meta">
                          {formatFileSize(item.file.size)} . {formatDisplayDateTime(item.file.uploadedAt)} . Uploaded by{' '}
                          {item.file.uploadedBy}
                        </span>
                      </span>
                      {item.file.objectUrl ? (
                        <a
                          className="folio-preview-download"
                          href={item.file.objectUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${item.file.name}`}
                        >
                          <DownloadGlyph />
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <span className="folio-preview-unavailable">Not Available</span>
                  )}
                </td>
                <td>{pages ?? '-'}</td>
                <td>{pageRange ?? '-'}</td>
                <td>
                  <ReadOnlyCheckbox
                    checked={inToc}
                    label={`${label} ${inToc ? 'counts' : 'does not count'} towards the page budget`}
                  />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default FolioPreviewTable;
