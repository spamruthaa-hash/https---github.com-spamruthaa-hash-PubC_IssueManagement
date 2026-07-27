import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { type Article } from '../data/articles';
import { JOURNALS } from '../data/journals';
import { createExternalArticle } from '../utils/lineupArticles';
import './AddNewArticleModal.css';

export interface AddNewArticleModalProps {
  isOpen: boolean;
  journalId: string;
  existingArticleIds: string[];
  onClose: () => void;
  onAdd: (article: Article) => void;
}

interface FormState {
  journalId: string;
  id: string;
  title: string;
  author: string;
  doi: string;
}

interface UploadState {
  name: string;
  size: number;
  type: string;
}

const UPLOAD_MAX_SIZE = 10 * 1024 * 1024;
const UPLOAD_EXTENSIONS = ['doc', 'docx', 'pdf', 'xlsx'];

const emptyForm = (journalId: string): FormState => ({
  journalId,
  id: '',
  title: '',
  author: '',
  doi: '',
});

const AddNewArticleModal = ({
  isOpen,
  journalId,
  existingArticleIds,
  onClose,
  onAdd,
}: AddNewArticleModalProps) => {
  const [form, setForm] = useState<FormState>(() => emptyForm(journalId));
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'upload', string>>>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const existingIds = useMemo(() => new Set(existingArticleIds), [existingArticleIds]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm(journalId));
    setUpload(null);
    setErrors({});
  }, [isOpen, journalId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleUploadFile = (file?: File | null) => {
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!UPLOAD_EXTENSIONS.includes(extension)) {
      setErrors(prev => ({ ...prev, upload: 'Upload a DOCX, PDF, or XLSX file.' }));
      return;
    }
    if (file.size > UPLOAD_MAX_SIZE) {
      setErrors(prev => ({ ...prev, upload: 'File is larger than 10 MB.' }));
      return;
    }

    setUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setErrors(prev => ({ ...prev, upload: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState | 'upload', string>> = {};
    const id = form.id.trim();

    if (!form.journalId) next.journalId = 'Journal is required';
    if (!id) next.id = 'Article ID is required';
    else if (existingIds.has(id)) next.id = 'This article ID is already in use';

    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.author.trim()) next.author = 'Author is required';
    if (!form.doi.trim()) next.doi = 'DOI is required';
    if (!upload) next.upload = 'Article file is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || !upload) return;

    const article = createExternalArticle({
      id: form.id.trim(),
      title: form.title,
      author: form.author,
      doi: form.doi,
      uploadFile: upload,
    });

    onAdd(article);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-new-article-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="add-new-article-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-new-article-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="add-new-article-header">
          <button type="button" className="add-new-article-back" onClick={onClose} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 id="add-new-article-title">Add New Article</h2>
        </header>

        <form className="add-new-article-form" onSubmit={handleSubmit}>
          <div className="add-new-article-row">
            <div className="add-new-article-field">
              <label className="add-new-article-label" htmlFor="external-article-journal">
                Journal <span className="required">*</span>
              </label>
              <div className="add-new-article-select-wrap">
                <select
                  id="external-article-journal"
                  className="add-new-article-select"
                  value={form.journalId}
                  onChange={event => setForm(prev => ({ ...prev, journalId: event.target.value }))}
                >
                  {JOURNALS.map(journal => (
                    <option key={journal.id} value={journal.id}>{journal.acronym}</option>
                  ))}
                </select>
              </div>
              {errors.journalId && <p className="add-new-article-error">{errors.journalId}</p>}
            </div>

            <div className="add-new-article-field">
              <label className="add-new-article-label" htmlFor="external-article-id">
                Article ID <span className="required">*</span>
              </label>
              <input
                id="external-article-id"
                className="add-new-article-input"
                value={form.id}
                onChange={event => setForm(prev => ({ ...prev, id: event.target.value }))}
              />
              {errors.id && <p className="add-new-article-error">{errors.id}</p>}
            </div>
          </div>

          <div className="add-new-article-field">
            <label className="add-new-article-label" htmlFor="external-article-title">
              Title <span className="required">*</span>
            </label>
            <input
              id="external-article-title"
              className="add-new-article-input"
              value={form.title}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              placeholder="Enter Title"
            />
            {errors.title && <p className="add-new-article-error">{errors.title}</p>}
          </div>

          <div className="add-new-article-row">
            <div className="add-new-article-field">
              <label className="add-new-article-label" htmlFor="external-article-author">
                Author <span className="required">*</span>
              </label>
              <input
                id="external-article-author"
                className="add-new-article-input"
                value={form.author}
                onChange={event => setForm(prev => ({ ...prev, author: event.target.value }))}
              />
              {errors.author && <p className="add-new-article-error">{errors.author}</p>}
            </div>

            <div className="add-new-article-field">
              <label className="add-new-article-label" htmlFor="external-article-doi">
                DOI <span className="required">*</span>
              </label>
              <input
                id="external-article-doi"
                className="add-new-article-input"
                value={form.doi}
                onChange={event => setForm(prev => ({ ...prev, doi: event.target.value }))}
              />
              {errors.doi && <p className="add-new-article-error">{errors.doi}</p>}
            </div>
          </div>

          <div className="add-new-article-field">
            <span className="add-new-article-label">
              Upload Article <span className="required">*</span>
            </span>
            <input
              ref={uploadInputRef}
              type="file"
              className="add-new-article-upload-input"
              accept=".doc,.docx,.pdf,.xlsx"
              onChange={event => handleUploadFile(event.target.files?.[0])}
            />
            {upload ? (
              <div className="add-new-article-upload-card">
                <span className="add-new-article-upload-name">{upload.name}</span>
                <button
                  type="button"
                  className="add-new-article-upload-remove"
                  aria-label={`Remove ${upload.name}`}
                  onClick={() => setUpload(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="add-new-article-dropzone"
                onClick={() => uploadInputRef.current?.click()}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  handleUploadFile(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="add-new-article-dropzone-main">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M10 13.33V4.17m0 0L6.67 7.5M10 4.17l3.33 3.33M5 15.83h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>
                    Drag and drop file or <u>Browse</u>
                  </span>
                </span>
                <small>DOCX, PDF, or XLSX. Max. file size: 10 MB.</small>
              </button>
            )}
            {errors.upload && <p className="add-new-article-error">{errors.upload}</p>}
          </div>

          <footer className="add-new-article-footer">
            <button type="submit" className="add-new-article-primary">
              Add
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default AddNewArticleModal;
