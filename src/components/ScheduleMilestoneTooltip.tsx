import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { ScheduleMilestoneTooltipData } from '../utils/scheduleMilestoneModal';
import './ScheduleMilestoneTooltip.css';

interface ScheduleMilestoneTooltipProps {
  isOpen: boolean;
  data: ScheduleMilestoneTooltipData | null;
  anchorEl: HTMLElement | null;
}

const TOOLTIP_GAP = 8;
const TOOLTIP_WIDTH = 380;
const VIEWPORT_PADDING = 8;

const TOOLTIP_ROWS: { key: keyof ScheduleMilestoneTooltipData; label: string }[] = [
  { key: 'issueLine', label: 'Issue' },
  { key: 'milestoneLine', label: 'Milestone' },
  { key: 'dateRange', label: 'Timeline' },
  { key: 'issueCloseDate', label: 'Close date' },
  { key: 'publicationDate', label: 'Est. Publication date' },
];

const computeTooltipPosition = (
  anchor: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number } => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchor.right + TOOLTIP_GAP;
  if (left + tooltipWidth > vw - VIEWPORT_PADDING) {
    left = anchor.left - tooltipWidth - TOOLTIP_GAP;
  }
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, vw - tooltipWidth - VIEWPORT_PADDING),
  );

  let top = anchor.top + (anchor.height - tooltipHeight) / 2;
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, vh - tooltipHeight - VIEWPORT_PADDING),
  );

  return { top, left };
};

const ScheduleMilestoneTooltip = ({
  isOpen,
  data,
  anchorEl,
}: ScheduleMilestoneTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl || !tooltipRef.current) {
      setPosition(null);
      return;
    }

    const anchorRect = anchorEl.getBoundingClientRect();
    const { width, height } = tooltipRef.current.getBoundingClientRect();
    setPosition(
      computeTooltipPosition(
        anchorRect,
        width || TOOLTIP_WIDTH,
        height,
      ),
    );
  }, [isOpen, anchorEl, data]);

  if (!isOpen || !data) return null;

  const style: CSSProperties = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: TOOLTIP_WIDTH,
        zIndex: 1099,
      }
    : { position: 'fixed', visibility: 'hidden', width: TOOLTIP_WIDTH, zIndex: 1099 };

  return createPortal(
    <div
      ref={tooltipRef}
      className="schedule-milestone-tooltip"
      style={style}
      role="tooltip"
    >
      {TOOLTIP_ROWS.map(({ key, label }) => (
        <div key={key} className="schedule-milestone-tooltip__row">
          <span className="schedule-milestone-tooltip__label">{label}</span>
          <span className="schedule-milestone-tooltip__value">{data[key]}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default ScheduleMilestoneTooltip;
