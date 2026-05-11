import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
} from 'react';
import './Toast.css';

export type ToastVariant = 'success' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  /** Stable identifier — used to remount/restart the animation when consecutive toasts arrive. */
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  /** Auto-dismiss timeout in ms. Defaults to 3000. */
  durationMs?: number;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

type ToastPhase = 'in' | 'out';

const CheckCircleIcon = () => (
  <svg
    className="toast-icon-check"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.78-8.78a.75.75 0 1 0-1.06-1.06L7 8.88 5.28 7.16a.75.75 0 1 0-1.06 1.06l2.25 2.25c.3.3.77.3 1.06 0l4.25-4.25Z"
      fill="#007A39"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"
      fill="#5D6871"
    />
  </svg>
);

/**
 * The Toast component manages its own enter/leave animation so callers can simply
 * toggle the `toast` prop on and off. If a new toast arrives while one is still
 * visible, the current one is animated out first and the next is queued — no
 * hard cuts, no two toasts overlapping.
 */
const Toast = ({ toast, onDismiss }: ToastProps) => {
  const [activeToast, setActiveToast] = useState<ToastData | null>(toast);
  const [phase, setPhase] = useState<ToastPhase>('in');
  /** Holds a toast that arrived while we were animating out; consumed when the exit ends. */
  const pendingNextRef = useRef<ToastData | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);

  /* Reconcile prop changes with the internal display state. */
  useEffect(() => {
    if (toast === null) {
      // Parent dismissed: start the exit animation if we're currently showing something.
      if (activeToast && phase === 'in') {
        pendingNextRef.current = null;
        setPhase('out');
      }
      return;
    }
    // A toast was provided.
    if (activeToast === null) {
      // Fresh entry — show it straight away with the enter animation.
      pendingNextRef.current = null;
      setActiveToast(toast);
      setPhase('in');
      return;
    }
    if (toast.id === activeToast.id) {
      // Same toast, no work needed.
      return;
    }
    // Different toast arrived. Animate the current one out, then enter the new one.
    pendingNextRef.current = toast;
    if (phase === 'in') {
      setPhase('out');
    }
  }, [toast, activeToast, phase]);

  /* Auto-dismiss timer — only runs while we're in the 'in' phase. */
  useEffect(() => {
    if (!activeToast || phase !== 'in') return;
    const duration = activeToast.durationMs ?? 3000;
    autoDismissTimerRef.current = window.setTimeout(onDismiss, duration);
    return () => {
      if (autoDismissTimerRef.current !== null) {
        window.clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeToast, phase, onDismiss]);

  const handleAnimationEnd = useCallback(
    (e: ReactAnimationEvent<HTMLDivElement>) => {
      if (e.animationName !== 'toast-leave') return;
      if (phase !== 'out') return;
      const next = pendingNextRef.current;
      pendingNextRef.current = null;
      if (next) {
        setActiveToast(next);
        setPhase('in');
      } else {
        setActiveToast(null);
      }
    },
    [phase],
  );

  if (!activeToast) return null;

  return (
    <div className="toast-region" role="region" aria-label="Notifications">
      <div
        key={activeToast.id}
        className={`toast toast-${activeToast.variant} toast--${phase}`}
        role={activeToast.variant === 'success' ? 'status' : 'alert'}
        aria-live={activeToast.variant === 'success' ? 'polite' : 'assertive'}
        onAnimationEnd={handleAnimationEnd}
      >
        {activeToast.variant === 'success' && <span className="toast-accent" aria-hidden />}
        <div className="toast-body">
          {activeToast.variant === 'success' && <CheckCircleIcon />}
          <p className="toast-message">{activeToast.message}</p>
          {activeToast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                activeToast.action?.onClick();
                onDismiss();
              }}
              /* Don't auto-dismiss while the user is hovering an action they might click. */
              disabled={phase === 'out'}
            >
              {activeToast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={onDismiss}
            disabled={phase === 'out'}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
