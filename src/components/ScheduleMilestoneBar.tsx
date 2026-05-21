import { useRef, type DragEvent, type MouseEvent, type PointerEvent } from 'react';
import Badge, { type BadgeVariant } from './Badge';
import './ScheduleMilestoneBar.css';

export type ScheduleMilestoneTone = 'regular' | 'special' | 'publish';

export type ScheduleMilestoneBarLayout = 'next-to-next' | 'top-bottom';

const DRAG_ATTEMPT_THRESHOLD_PX = 8;

interface ScheduleMilestoneBarProps {
  label: string;
  dateRange: string;
  tone: ScheduleMilestoneTone;
  badgeVariant: BadgeVariant;
  layout?: ScheduleMilestoneBarLayout;
  isSelected?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragAttempt?: (barEl: HTMLButtonElement) => void;
}

const ScheduleMilestoneBar = ({
  label,
  dateRange,
  tone,
  badgeVariant,
  layout = 'next-to-next',
  isSelected = false,
  onClick,
  onDragAttempt,
}: ScheduleMilestoneBarProps) => {
  const suppressClickRef = useRef(false);
  const dragNotifiedRef = useRef(false);
  const barRef = useRef<HTMLButtonElement>(null);

  const notifyDragAttempt = () => {
    if (!onDragAttempt || dragNotifiedRef.current || !barRef.current) return;
    dragNotifiedRef.current = true;
    suppressClickRef.current = true;
    onDragAttempt(barRef.current);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    suppressClickRef.current = false;
    dragNotifiedRef.current = false;

    if (!onDragAttempt) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const target = event.currentTarget;

    const handlePointerMove = (moveEvent: Event) => {
      if (dragNotifiedRef.current) return;
      const pointer = moveEvent as globalThis.PointerEvent;
      const distance = Math.hypot(pointer.clientX - startX, pointer.clientY - startY);
      if (distance >= DRAG_ATTEMPT_THRESHOLD_PX) {
        notifyDragAttempt();
      }
    };

    const endPointerTracking = () => {
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', endPointerTracking);
      target.removeEventListener('pointercancel', endPointerTracking);
    };

    target.addEventListener('pointermove', handlePointerMove);
    target.addEventListener('pointerup', endPointerTracking);
    target.addEventListener('pointercancel', endPointerTracking);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'none';
    event.dataTransfer.setData('text/plain', '');
    notifyDragAttempt();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onClick?.(event);
  };

  const className = [
    'schedule-milestone-bar',
    `schedule-milestone-bar--${tone}`,
    `schedule-milestone-bar--${layout}`,
    onClick ? 'schedule-milestone-bar--interactive' : '',
    isSelected ? 'schedule-milestone-bar--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <Badge variant={badgeVariant}>{label}</Badge>
      <span className="schedule-milestone-bar__dates">{dateRange}</span>
    </>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      ref={barRef}
      type="button"
      className={className}
      aria-pressed={isSelected}
      draggable={Boolean(onDragAttempt)}
      onPointerDown={handlePointerDown}
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      {content}
    </button>
  );
};

export default ScheduleMilestoneBar;
