import { useEffect, useState, type AnimationEvent as ReactAnimationEvent } from 'react';
import './IssueDeleteModal.css';

interface IssueDeleteModalProps {
  isOpen: boolean;
  issueLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

const IssueDeleteModal = ({ isOpen, issueLabel, onClose, onConfirm }: IssueDeleteModalProps) => {
  /**
   * Local mount/animation state so the dialog can play its exit animation
   * after the parent toggles `isOpen` off.
   */
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  /**
   * Once the user has confirmed deletion we want the exit animation to remain in flight
   * even after `issueLabel` resets — so we freeze the label until the modal fully unmounts.
   */
  const [displayLabel, setDisplayLabel] = useState(issueLabel);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsExiting(false);
      setDisplayLabel(issueLabel);
    } else if (shouldRender) {
      setIsExiting(true);
    }
  }, [isOpen, shouldRender, issueLabel]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleOverlayAnimationEnd = (e: ReactAnimationEvent<HTMLDivElement>) => {
    if (!isExiting) return;
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== 'delete-modal-overlay-leave') return;
    setShouldRender(false);
    setIsExiting(false);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`delete-modal-overlay${isExiting ? ' delete-modal-overlay--leaving' : ''}`}
      onClick={onClose}
      onAnimationEnd={handleOverlayAnimationEnd}
      role="presentation"
      aria-hidden={isExiting}
    >
      <div
        className="delete-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-delete-title"
        aria-describedby="issue-delete-description"
        onClick={e => e.stopPropagation()}
      >
        <div className="delete-modal-header">
          <h2 id="issue-delete-title" className="delete-modal-title">
            Issue Deletion
          </h2>
          <button
            type="button"
            className="delete-modal-close"
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
        <div className="delete-modal-body">
          <p id="issue-delete-description" className="delete-modal-message">
            Are you sure you want to delete the Issue {displayLabel}?
          </p>
        </div>
        <div className="delete-modal-footer">
          <button type="button" className="delete-modal-confirm" onClick={onConfirm} autoFocus>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueDeleteModal;
