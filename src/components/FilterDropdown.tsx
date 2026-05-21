import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './FilterDropdown.css';

export interface FilterDropdownOption {
  id: string;
  label: string;
}

/** Max options shown before the menu scrolls (Journal and similar long lists). */
export const FILTER_MENU_MAX_VISIBLE_OPTIONS = 7;

interface FilterDropdownProps {
  label: string;
  value: string;
  displayValue: string;
  options: FilterDropdownOption[];
  onSelect: (id: string) => void;
  alignRight?: boolean;
}

const FilterDropdown = ({
  label,
  value,
  displayValue,
  options,
  onSelect,
  alignRight,
}: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const isScrollable = options.length > FILTER_MENU_MAX_VISIBLE_OPTIONS;

  return (
    <div className="issues-filter" ref={wrapperRef}>
      <button
        type="button"
        className="issues-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="issues-filter-label">{label}:</span>
        <span className="issues-filter-value">{displayValue}</span>
        <svg
          className={`issues-filter-chevron${open ? ' issues-filter-chevron--open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path d="M7 10l5 5 5-5H7Z" fill="#35424D" />
        </svg>
      </button>
      {open && (
        <div
          className={[
            'issues-filter-menu',
            alignRight && 'issues-filter-menu--right',
            isScrollable && 'issues-filter-menu--scrollable',
          ]
            .filter(Boolean)
            .join(' ')}
          role="listbox"
          style={
            isScrollable
              ? ({
                  ['--issues-filter-menu-max-visible' as string]:
                    FILTER_MENU_MAX_VISIBLE_OPTIONS,
                } as CSSProperties)
              : undefined
          }
        >
          {options.map(option => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`issues-filter-item${isSelected ? ' issues-filter-item--selected' : ''}`}
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
              >
                <span className="issues-filter-item-check" aria-hidden>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 10.5l2 2L13 9"
                        stroke="#35424D"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="issues-filter-item-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
