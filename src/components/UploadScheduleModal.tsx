import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { JOURNALS } from '../data/journals';
import './UploadScheduleModal.css';

interface UploadScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (journalId: string, file: File) => void;
  onManualEntry: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
};

const formatAttachmentTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${sec}`;
};

const formatAttachmentMeta = (size: number, timestamp: string): string =>
  `${formatFileSize(size)}. ${formatAttachmentTimestamp(timestamp)}`;

const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

const ScheduleFileIcon = ({ fileName }: { fileName: string }) => {
  const extension = getFileExtension(fileName);
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isPdf = extension === 'pdf';
  const isDocument = ['doc', 'docx', 'md', 'rtf', 'txt', 'xls', 'xlsx', 'csv'].includes(extension);
  const tone = isArchive ? '#f6c343' : isImage ? '#58a6ff' : isPdf ? '#f14848' : isDocument ? '#5b7cfa' : '#9aa1a6';
  const label = isArchive ? 'ZIP' : isImage ? 'IMG' : isPdf ? 'PDF' : isDocument ? 'DOC' : 'FILE';

  return (
    <span className="upload-schedule-file-icon" style={{ '--schedule-file-tone': tone } as CSSProperties} aria-hidden>
      {isArchive ? (
        <svg width="37" height="32" viewBox="0 0 37 32" fill="none">
          <path d="M2 8h13.5l2.8 3H35v16.5A2.5 2.5 0 0 1 32.5 30h-30A2.5 2.5 0 0 1 0 27.5v-17A2.5 2.5 0 0 1 2 8Z" fill="var(--schedule-file-tone)" />
          <path d="M2.5 4h11.2l3 3H35v5H0V6.5A2.5 2.5 0 0 1 2.5 4Z" fill="#ffd96b" />
          <path d="M9 12h2v2H9v-2Zm2 2h2v2h-2v-2Zm-2 2h2v2H9v-2Zm2 2h2v2h-2v-2Zm-2 2h2v2H9v-2Zm2 2h2v2h-2v-2Z" fill="#ffffff" opacity="0.8" />
        </svg>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M7 3h12l6 6v20H7V3Z" fill="#ffffff" stroke="var(--schedule-file-tone)" strokeWidth="1.5" />
          <path d="M19 3v6h6" stroke="var(--schedule-file-tone)" strokeWidth="1.5" />
          <rect x="9.5" y="18" width="13" height="8" rx="1" fill="var(--schedule-file-tone)" />
          <text x="16" y="23.7" textAnchor="middle" fill="#ffffff" fontSize="4.5" fontWeight="700">{label}</text>
        </svg>
      )}
    </span>
  );
};

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M6 19h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const UploadScheduleModal = ({
  isOpen,
  onClose,
  onUpload,
  onManualEntry,
}: UploadScheduleModalProps) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileAddedAt, setSelectedFileAddedAt] = useState<string | null>(null);
  const [showJournalMenu, setShowJournalMenu] = useState(false);
  const [journalError, setJournalError] = useState('');
  const [fileError, setFileError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const journalDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      setIsExiting(true);
    }
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!journalDropdownRef.current?.contains(event.target as Node)) {
        setShowJournalMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setSelectedJournalId('');
    setSelectedFile(null);
    setSelectedFileAddedAt(null);
    setShowJournalMenu(false);
    setJournalError('');
    setFileError('');
  };

  const handleOverlayAnimationEnd = (e: ReactAnimationEvent<HTMLDivElement>) => {
    if (!isExiting) return;
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== 'upload-schedule-modal-overlay-leave') return;
    setShouldRender(false);
    setIsExiting(false);
    resetForm();
  };

  const selectedJournal = JOURNALS.find(j => j.id === selectedJournalId);
  const canUpload = Boolean(selectedJournalId && selectedFile);

  const applyFile = (file: File | null) => {
    if (!file) return;
    setFileError('');
    setSelectedFile(file);
    setSelectedFileAddedAt(new Date().toISOString());
  };

  const handleDownloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSelectedFileAddedAt(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    applyFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    applyFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = () => {
    let valid = true;
    if (!selectedJournalId) {
      setJournalError('Journal is required');
      valid = false;
    }
    if (!selectedFile) {
      setFileError('Upload file is required');
      valid = false;
    }
    if (!valid || !selectedFile) return;

    onUpload(selectedJournalId, selectedFile);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`upload-schedule-modal-overlay${isExiting ? ' upload-schedule-modal-overlay--leaving' : ''}`}
      onClick={onClose}
      onAnimationEnd={handleOverlayAnimationEnd}
      role="presentation"
      aria-hidden={isExiting}
    >
      <div
        className="upload-schedule-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-schedule-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="upload-schedule-modal-header">
          <h2 id="upload-schedule-modal-title" className="upload-schedule-modal-title">
            Upload Schedule
          </h2>
          <button
            type="button"
            className="upload-schedule-modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"
                fill="#5D6871"
              />
            </svg>
          </button>
        </div>

        <div className="upload-schedule-modal-body">
          <div className="upload-schedule-modal-fields">
              <div className="upload-schedule-field">
                <label className="upload-schedule-label" htmlFor="upload-schedule-journal">
                  Journal
                  <span className="upload-schedule-required" aria-hidden>*</span>
                </label>
                <div className="upload-schedule-journal-dropdown" ref={journalDropdownRef}>
                  <button
                    id="upload-schedule-journal"
                    type="button"
                    className={`upload-schedule-journal-trigger${selectedJournal ? '' : ' upload-schedule-journal-trigger--placeholder'}`}
                    aria-haspopup="listbox"
                    aria-expanded={showJournalMenu}
                    onClick={() => setShowJournalMenu(prev => !prev)}
                  >
                    <span>{selectedJournal?.acronym ?? 'Select Journal'}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7 10l5 5 5-5H7z" fill="#868E94" />
                    </svg>
                  </button>
                  {showJournalMenu && (
                    <div className="upload-schedule-journal-menu" role="listbox">
                      {JOURNALS.map(journal => (
                        <button
                          key={journal.id}
                          type="button"
                          role="option"
                          aria-selected={journal.id === selectedJournalId}
                          className="upload-schedule-journal-option"
                          onClick={() => {
                            setSelectedJournalId(journal.id);
                            setShowJournalMenu(false);
                            setJournalError('');
                          }}
                        >
                          {journal.acronym}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {journalError && (
                  <p className="upload-schedule-field-error" role="alert">{journalError}</p>
                )}
              </div>

              <div className="upload-schedule-field">
                <span className="upload-schedule-label">
                  Upload File
                  <span className="upload-schedule-required" aria-hidden>*</span>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="upload-schedule-file-input"
                  onChange={handleFileInputChange}
                />
                {selectedFile ? (
                  <div className="upload-schedule-attachment-card">
                    <ScheduleFileIcon fileName={selectedFile.name} />
                    <div className="upload-schedule-attachment-copy">
                      <strong>{selectedFile.name}</strong>
                      <span>
                        {selectedFileAddedAt
                          ? formatAttachmentMeta(selectedFile.size, selectedFileAddedAt)
                          : formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                    <div className="upload-schedule-attachment-actions">
                      <button
                        type="button"
                        aria-label={`Download ${selectedFile.name}`}
                        onClick={() => handleDownloadFile(selectedFile)}
                      >
                        <DownloadIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${selectedFile.name}`}
                        onClick={handleRemoveFile}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="upload-schedule-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={event => event.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <span className="upload-schedule-dropzone-icon" aria-hidden>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 16V7.85L8.4 10.45L7 9L12 4L17 9L15.6 10.45L13 7.85V16H11ZM6 20C5.45 20 4.97917 19.8042 4.5875 19.4125C4.19583 19.0208 4 18.55 4 18V15H6V18H18V15H20V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H6Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span>
                      Drag and drop file or <u>Browse</u>
                    </span>
                  </button>
                )}
                {fileError && (
                  <p className="upload-schedule-field-error" role="alert">{fileError}</p>
                )}
              </div>

              <div className="upload-schedule-manual-entry">
                <span className="upload-schedule-manual-divider">or</span>
                <button type="button" className="upload-schedule-manual-button" onClick={onManualEntry}>
                  Enter manually
                </button>
              </div>
            </div>
        </div>

        <div className="upload-schedule-modal-footer">
          <button
            type="button"
            className="upload-schedule-submit"
            disabled={!canUpload}
            onClick={handleUpload}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadScheduleModal;
