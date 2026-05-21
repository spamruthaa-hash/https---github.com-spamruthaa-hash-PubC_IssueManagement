import type { FolioPageGapSuggestion } from '../utils/folioPageGapSuggestions';
import './FolioArrangeGapSuggestion.css';

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4.12 12.68c.55.48.87 1.17.92 1.9l.03.42H15l.03-.42c.05-.73.37-1.42.92-1.9A6.98 6.98 0 0 0 12 2Zm0 2a5 5 0 0 1 2.94 9.05l-.59.51-.24 2.44h-4.22l-.24-2.44-.59-.51A5 5 0 0 1 12 4Z"
      fill="#0566ED"
    />
  </svg>
);

interface FolioArrangeGapSuggestionProps {
  suggestion: FolioPageGapSuggestion;
  onAccept: (suggestion: FolioPageGapSuggestion) => void;
  onReject: (suggestion: FolioPageGapSuggestion) => void;
}

const FolioArrangeGapSuggestion = ({
  suggestion,
  onAccept,
  onReject,
}: FolioArrangeGapSuggestionProps) => (
  <tr className="folio-arrange-gap-suggestion-row">
    <td className="folio-arrange-gap-suggestion-seq">
      <div className="folio-arrange-gap-suggestion-seq-inner">
        <span className="folio-arrange-gap-suggestion-drag" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="3.5" r="1.1" fill="currentColor" />
            <circle cx="11" cy="3.5" r="1.1" fill="currentColor" />
            <circle cx="5" cy="8" r="1.1" fill="currentColor" />
            <circle cx="11" cy="8" r="1.1" fill="currentColor" />
            <circle cx="5" cy="12.5" r="1.1" fill="currentColor" />
            <circle cx="11" cy="12.5" r="1.1" fill="currentColor" />
          </svg>
        </span>
        <span className="folio-arrange-gap-suggestion-seq-placeholder" aria-hidden>
          {suggestion.insertBeforeIndex + 1}
        </span>
      </div>
    </td>
    <td className="folio-arrange-gap-suggestion-cell" colSpan={5}>
      <div
        className="folio-arrange-gap-suggestion"
        role="region"
        aria-label="Folio page layout suggestion"
      >
        <div className="folio-arrange-gap-suggestion__icon-wrap" aria-hidden>
          <LightbulbIcon />
        </div>
        <div className="folio-arrange-gap-suggestion__copy">
          <p className="folio-arrange-gap-suggestion__eyebrow">Suggestion</p>
          <p className="folio-arrange-gap-suggestion__message">
            Add <strong>Blank</strong> or <strong>Advertisement</strong> next when the previous
            pages ends with odd number
          </p>
        </div>
        <div className="folio-arrange-gap-suggestion__actions">
          <button
            type="button"
            className="folio-arrange-gap-suggestion__action"
            onClick={() => onAccept(suggestion)}
          >
            Accept
          </button>
          <button
            type="button"
            className="folio-arrange-gap-suggestion__action"
            onClick={() => onReject(suggestion)}
          >
            Reject
          </button>
        </div>
      </div>
    </td>
  </tr>
);

export default FolioArrangeGapSuggestion;
