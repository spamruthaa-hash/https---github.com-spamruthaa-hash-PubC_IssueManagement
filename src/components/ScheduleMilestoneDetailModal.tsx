import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Badge from './Badge';
import type {
  ScheduleMilestoneModalData,
  ScheduleMilestoneProgressActionKind,
} from '../utils/scheduleMilestoneModal';
import './ScheduleMilestoneDetailModal.css';

interface ScheduleMilestoneDetailModalProps {
  isOpen: boolean;
  data: ScheduleMilestoneModalData | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEditDetails?: () => void;
  onProgressAction?: (kind: ScheduleMilestoneProgressActionKind) => void;
}

const POP_GAP = 16;
const POP_WIDTH = 560;
const VIEWPORT_PADDING = 16;
const POP_INITIAL_HEIGHT = 300;
const ARROW_INSET = 20;

export type PopoverPlacement = 'bottom' | 'right' | 'top' | 'left';

interface PopPosition {
  top: number;
  left: number;
  placement: PopoverPlacement;
  arrowOffset: number;
}

const OpenIssueIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h7v2H7v10h10v-5h2v7H5V5Z"
      fill="currentColor"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"
      fill="#5D6871"
    />
  </svg>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="schedule-milestone-pop__detail-row">
    <span className="schedule-milestone-pop__detail-label">{label}</span>
    <span className="schedule-milestone-pop__detail-value">{value}</span>
  </div>
);

const ProgressRow = ({
  label,
  value,
  wideLabel,
}: {
  label: string;
  value: string;
  wideLabel?: boolean;
}) => (
  <div className="schedule-milestone-pop__progress-row">
    <span
      className={`schedule-milestone-pop__detail-label${wideLabel ? ' schedule-milestone-pop__detail-label--wide' : ''}`}
    >
      {label}
    </span>
    <span className="schedule-milestone-pop__detail-value">{value}</span>
  </div>
);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

const centerAlongAxis = (
  anchorStart: number,
  anchorSize: number,
  popSize: number,
  pad: number,
  maxPos: number,
): number =>
  clamp(anchorStart + anchorSize / 2 - popSize / 2, pad, maxPos);

const alignPopoverLeft = (
  anchor: DOMRect,
  popWidth: number,
  pad: number,
  maxLeft: number,
): number => centerAlongAxis(anchor.left, anchor.width, popWidth, pad, maxLeft);

const overlapArea = (
  aLeft: number,
  aTop: number,
  aRight: number,
  aBottom: number,
  bLeft: number,
  bTop: number,
  bRight: number,
  bBottom: number,
): number => {
  const overlapW = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
  const overlapH = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
  return overlapW * overlapH;
};

const scorePopoverCandidate = (
  left: number,
  top: number,
  popWidth: number,
  popHeight: number,
  anchor: DOMRect,
  pad: number,
  vw: number,
  vh: number,
  priority: number,
): number => {
  const maxLeft = vw - popWidth - pad;
  const maxTop = vh - popHeight - pad;
  const clampedLeft = clamp(left, pad, maxLeft);
  const clampedTop = clamp(top, pad, maxTop);

  const popRight = clampedLeft + popWidth;
  const popBottom = clampedTop + popHeight;

  const visibleW = Math.max(0, Math.min(popRight, vw - pad) - Math.max(clampedLeft, pad));
  const visibleH = Math.max(0, Math.min(popBottom, vh - pad) - Math.max(clampedTop, pad));
  let score = visibleW * visibleH;

  score -= Math.abs(clampedLeft - left) * 12;
  score -= Math.abs(clampedTop - top) * 12;
  score -= overlapArea(
    clampedLeft,
    clampedTop,
    popRight,
    popBottom,
    anchor.left,
    anchor.top,
    anchor.right,
    anchor.bottom,
  ) * 1.25;
  score += priority * 3000;

  return score;
};

export const computePopoverPosition = (
  anchor: HTMLElement,
  popWidth: number,
  popHeight: number,
): PopPosition => {
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = VIEWPORT_PADDING;
  const maxLeft = vw - popWidth - pad;
  const maxTop = vh - popHeight - pad;
  const anchorCenterX = rect.left + rect.width / 2;
  const anchorCenterY = rect.top + rect.height / 2;
  const preferRight = anchorCenterX < vw * 0.52;

  type Candidate = {
    placement: PopoverPlacement;
    priority: number;
    left: number;
    top: number;
  };

  const sideTop = centerAlongAxis(rect.top, rect.height, popHeight, pad, maxTop);
  const rightCandidate: Candidate = {
    placement: 'right',
    priority: 5,
    left: rect.right + POP_GAP,
    top: sideTop,
  };
  const leftCandidate: Candidate = {
    placement: 'left',
    priority: 4,
    left: rect.left - popWidth - POP_GAP,
    top: sideTop,
  };

  const candidates: Candidate[] = [
    ...(preferRight ? [rightCandidate, leftCandidate] : [leftCandidate, rightCandidate]),
    {
      placement: 'bottom',
      priority: 3,
      left: alignPopoverLeft(rect, popWidth, pad, maxLeft),
      top: rect.bottom + POP_GAP,
    },
    {
      placement: 'top',
      priority: 2,
      left: alignPopoverLeft(rect, popWidth, pad, maxLeft),
      top: rect.top - popHeight - POP_GAP,
    },
  ];

  const best = candidates.reduce((winner, candidate) => {
    const score = scorePopoverCandidate(
      candidate.left,
      candidate.top,
      popWidth,
      popHeight,
      rect,
      pad,
      vw,
      vh,
      candidate.priority,
    );
    if (!winner || score > winner.score) {
      return { candidate, score };
    }
    return winner;
  }, null as { candidate: Candidate; score: number } | null);

  const chosen = best?.candidate ?? candidates[0];
  const left = clamp(chosen.left, pad, maxLeft);
  const top = clamp(chosen.top, pad, maxTop);

  const arrowOffset =
    chosen.placement === 'bottom' || chosen.placement === 'top'
      ? clamp(anchorCenterX - left, ARROW_INSET, popWidth - ARROW_INSET)
      : clamp(anchorCenterY - top, ARROW_INSET, popHeight - ARROW_INSET);

  return {
    top,
    left,
    placement: chosen.placement,
    arrowOffset,
  };
};

const ScheduleMilestoneDetailModal = ({
  isOpen,
  data,
  anchorEl,
  onClose,
  onEditDetails,
  onProgressAction,
}: ScheduleMilestoneDetailModalProps) => {
  const navigate = useNavigate();
  const [position, setPosition] = useState<PopPosition | null>(null);
  const [popEl, setPopEl] = useState<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchorEl || !popEl) return;
    const { width, height } = popEl.getBoundingClientRect();
    setPosition(
      computePopoverPosition(anchorEl, width || POP_WIDTH, height || POP_INITIAL_HEIGHT),
    );
  }, [anchorEl, popEl]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [isOpen, anchorEl, data, updatePosition]);

  useEffect(() => {
    if (!isOpen || !popEl) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });
    resizeObserver.observe(popEl);

    return () => resizeObserver.disconnect();
  }, [isOpen, popEl, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, onClose, updatePosition]);

  if (!isOpen || !data || !anchorEl || typeof document === 'undefined') return null;

  const { progress } = data;
  const isCompleted = progress.badgeStatus === 'completed';
  const isInProgress = progress.badgeStatus === 'in-progress';
  const isNotStarted = progress.badgeStatus === 'not-started';

  const openIssueDetails = () => {
    if (!data.canNavigateToIssue || !data.issueId) return;
    onClose();
    navigate(`/issues/${data.issueId}`);
  };

  const popStyle: CSSProperties = position
    ? {
        top: position.top,
        left: position.left,
        ['--schedule-milestone-pop-arrow' as string]: `${position.arrowOffset}px`,
      }
    : { top: -9999, left: -9999, visibility: 'hidden' };

  const placementClass = position
    ? `schedule-milestone-pop--${position.placement}`
    : 'schedule-milestone-pop--bottom';

  return createPortal(
    <>
      <div
        className="schedule-milestone-pop__backdrop"
        aria-hidden
        onMouseDown={onClose}
      />
      <div
        ref={setPopEl}
        className={`schedule-milestone-pop ${placementClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-milestone-pop-title"
        style={popStyle}
        onMouseDown={event => event.stopPropagation()}
      >
      <header className="schedule-milestone-pop__header">
        <div className="schedule-milestone-pop__title-group">
          <h2 id="schedule-milestone-pop-title" className="schedule-milestone-pop__title">
            {data.issueLabel}
          </h2>
          {data.canNavigateToIssue && (
            <button
              type="button"
              className="schedule-milestone-pop__open-issue"
              aria-label={`Open issue ${data.issueLabel}`}
              onClick={openIssueDetails}
            >
              <OpenIssueIcon />
            </button>
          )}
        </div>
        <button
          type="button"
          className="schedule-milestone-pop__close"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>

      <div className="schedule-milestone-pop__body">
        <section className="schedule-milestone-pop__section" aria-labelledby="schedule-milestone-details-heading">
          <div className="schedule-milestone-pop__section-head">
            <h3 id="schedule-milestone-details-heading" className="schedule-milestone-pop__section-title">
              Details
            </h3>
            {data.canNavigateToIssue && onEditDetails && (
              <button
                type="button"
                className="schedule-milestone-pop__light-action"
                onClick={onEditDetails}
              >
                Edit
              </button>
            )}
          </div>
          <div className="schedule-milestone-pop__details-grid">
            <DetailRow label="Type" value={data.details.type} />
            <DetailRow label="Cover Month" value={data.details.coverMonth} />
            <DetailRow label="Assigned Articles" value={String(data.details.assignedArticles)} />
            <DetailRow label="Issue Close Date" value={data.details.issueCloseDate} />
            <DetailRow label="Output Format" value={data.details.outputFormat} />
            <DetailRow label="Online Pub. Date" value={data.details.onlinePubDate} />
          </div>
        </section>

        <section className="schedule-milestone-pop__section" aria-labelledby="schedule-milestone-progress-heading">
          <div className="schedule-milestone-pop__progress-head">
            <div className="schedule-milestone-pop__progress-head-start">
              <h3 id="schedule-milestone-progress-heading" className="schedule-milestone-pop__section-title">
                Progress
              </h3>
              <Badge variant={progress.badgeStatus}>{progress.milestoneLabel}</Badge>
            </div>
            {data.progressAction && onProgressAction && (
              <button
                type="button"
                className="schedule-milestone-pop__light-action"
                onClick={() => onProgressAction(data.progressAction!.kind)}
              >
                {data.progressAction.label}
              </button>
            )}
          </div>

          {isNotStarted && progress.estCompletion && (
            <div className="schedule-milestone-pop__progress-grid schedule-milestone-pop__progress-grid--single">
              <ProgressRow label="Est. Completion" value={progress.estCompletion} wideLabel />
            </div>
          )}

          {isInProgress && (
            <div className="schedule-milestone-pop__progress-grid">
              {progress.startValue && (
                <ProgressRow label={progress.startLabel ?? 'Start'} value={progress.startValue} />
              )}
              {progress.endValue && (
                <ProgressRow
                  label={progress.endLabel ?? 'Est. Completion'}
                  value={progress.endValue}
                  wideLabel
                />
              )}
            </div>
          )}

          {isCompleted && (
            <div className="schedule-milestone-pop__progress-grid schedule-milestone-pop__progress-grid--completed">
              {progress.startValue && (
                <ProgressRow label={progress.startLabel ?? 'Start'} value={progress.startValue} />
              )}
              {progress.endValue && (
                <ProgressRow label={progress.endLabel ?? 'End'} value={progress.endValue} wideLabel />
              )}
              {progress.duration && <ProgressRow label="Duration" value={progress.duration} />}
              {progress.confirmedBy && progress.confirmedAt && (
                <div className="schedule-milestone-pop__confirmed">
                  <span className="schedule-milestone-pop__detail-label">Confirmed by</span>
                  <span className="schedule-milestone-pop__confirmed-value">
                    <span>{progress.confirmedBy}</span>
                    <span className="schedule-milestone-pop__confirmed-dot" aria-hidden />
                    <span>{progress.confirmedAt}</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
    </>,
    document.body,
  );
};

export default ScheduleMilestoneDetailModal;
