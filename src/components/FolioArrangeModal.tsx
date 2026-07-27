import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getCurrentUser } from '../auth/currentUser';
import { PAGE_BUDGET, type Article } from '../data/articles';
import { getLineupArticlesForJournal } from '../utils/lineupArticles';
import type { FolioArrangement, FolioArrangementItem, FolioFileAttachment, FolioMatterType, Issue } from '../types/issue';
import AddNewArticleModal from './AddNewArticleModal';
import ArticleLineupModal from './ArticleLineupModal';
import { buildDefaultFolioArrangementItems } from '../utils/folioArrangementDefaults';
import {
  getFolioItemPageCount,
  recalculateFolioPageRanges,
} from '../utils/folioPageRanges';
import {
  pruneDismissedGapSuggestions,
  type FolioPageGapSuggestion,
} from '../utils/folioPageGapSuggestions';
import FolioArrangeTable, { FOLIO_MATTER_LABELS, requiresFolioFile } from './FolioArrangeTable';
import './FolioArrangeModal.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = ['doc', 'docx', 'pdf', 'xls', 'xlsx'];

/** A folio cannot be confirmed with fewer articles than this. */
const MIN_FOLIO_CONFIRM_ARTICLES = 4;

export interface FolioArrangeCreateWizardHandlers {
  onBack: () => void;
  onProceed: () => void;
  onSaveDraft: (issueId: string, arrangement: FolioArrangement, externalArticles?: Article[]) => void;
}

interface FolioArrangeModalProps {
  isOpen: boolean;
  issue: Issue | null;
  onClose: () => void;
  onSave: (issueId: string, arrangement: FolioArrangement, externalArticles?: Article[]) => void;
  /** Optional Create Issue step (Jane): Back / Proceed / Save draft / Confirm Folio */
  createWizard?: FolioArrangeCreateWizardHandlers;
  /** Render inline as a wizard stage instead of its own centered dialog. */
  embedded?: boolean;
  /** Notifies parent when a nested dialog (add item / add article) is open. */
  onNestedModalOpenChange?: (open: boolean) => void;
}

const ADD_ITEM_MATTER_TYPES = Object.keys(FOLIO_MATTER_LABELS) as FolioMatterType[];

/** Categories offered when accepting an odd-page gap suggestion (Figma). */
const GAP_SUGGESTION_CATEGORIES: FolioMatterType[] = ['blank', 'advertisement'];

type AddItemModalTarget = {
  insertAfterIndex?: number;
  insertBeforeIndex?: number;
  gapSuggestionId?: string;
  allowedCategories?: FolioMatterType[];
};

type AddArticleFlow = 'picker' | 'new';

type AddArticleModalTarget = {
  insertAfterIndex?: number;
  flow: AddArticleFlow;
};
const SINGLE_INSTANCE_MATTER_TYPES: FolioMatterType[] = [
  'masthead',
  'table-of-contents',
  'call-for-papers',
  'upcoming-issue',
];

const addableMatterItem = (matterType: FolioMatterType, file?: FolioFileAttachment): FolioArrangementItem =>
  matterType === 'blank'
    ? blankItem()
    : {
        id: `matter-${matterType}-${Date.now()}`,
        kind: 'matter',
        matterType,
        ...(file ? { file } : {}),
      };

const blankItem = (): FolioArrangementItem => ({
  id: `matter-blank-${Date.now()}`,
  kind: 'matter',
  matterType: 'blank',
});

const articleItem = (articleId: string): FolioArrangementItem => ({
  id: `article-${articleId}`,
  kind: 'article',
  articleId,
  startPage: 1,
  endPage: 1,
});

const buildArticlesById = (articles: Article[]): Record<string, Article> =>
  articles.reduce<Record<string, Article>>((acc, article) => {
    acc[article.id] = article;
    return acc;
  }, {});

const getFileExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const countPdfPages = async (file: File): Promise<number | undefined> => {
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const pageMatches = text.match(/\/Type\s*\/Page(?!s)\b/g);
    return pageMatches?.length || undefined;
  } catch {
    return undefined;
  }
};

const getMissingRequiredUploadLabels = (items: FolioArrangementItem[]): string[] => Array.from(new Set(
  items.flatMap(item => (
    item.kind === 'matter' && requiresFolioFile(item.matterType) && !item.file
      ? [FOLIO_MATTER_LABELS[item.matterType].label]
      : []
  )),
));

const hasRequiredUploads = (items: FolioArrangementItem[]): boolean =>
  getMissingRequiredUploadLabels(items).length === 0;

const removeTemporaryFileUrls = (items: FolioArrangementItem[]): FolioArrangementItem[] =>
  items.map(item => {
    if (item.kind !== 'matter' || !item.file?.objectUrl) return item;

    const file = { ...item.file };
    delete file.objectUrl;
    return { ...item, file };
  });

const buildDefaultItems = (issue: Issue): FolioArrangementItem[] => {
  if (issue.folioArrangement?.items.length) {
    return issue.folioArrangement.items;
  }

  return buildDefaultFolioArrangementItems(issue);
};

const FolioArrangeModal = ({ isOpen, issue, onClose, onSave, createWizard, embedded = false, onNestedModalOpenChange }: FolioArrangeModalProps) => {
  const [items, setItems] = useState<FolioArrangementItem[]>([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addItemModalTarget, setAddItemModalTarget] = useState<AddItemModalTarget | null>(null);
  const [addArticleModalTarget, setAddArticleModalTarget] = useState<AddArticleModalTarget | null>(null);
  const [externalArticlesState, setExternalArticlesState] = useState<Article[]>([]);
  const [selectedAddItemType, setSelectedAddItemType] = useState<FolioMatterType | ''>('');
  const [selectedAddItemFile, setSelectedAddItemFile] = useState<FolioFileAttachment | null>(null);
  const [isAddItemCategoryOpen, setIsAddItemCategoryOpen] = useState(false);
  const [isReturningFromAddItem, setIsReturningFromAddItem] = useState(false);
  const [isReturningFromAddArticle, setIsReturningFromAddArticle] = useState(false);
  const [isClosingAddArticle, setIsClosingAddArticle] = useState(false);
  const [dismissedGapSuggestionIds, setDismissedGapSuggestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addItemFileInputRef = useRef<HTMLInputElement>(null);
  const addArticleCloseTimeoutRef = useRef<number | null>(null);
  const fileObjectUrlsRef = useRef<Set<string>>(new Set());

  const availableArticles = useMemo(
    () => (issue ? getLineupArticlesForJournal(issue.journalId, externalArticlesState) : []),
    [externalArticlesState, issue],
  );
  const articlesById = useMemo(() => buildArticlesById(availableArticles), [availableArticles]);
  const currentFolioArticleIds = useMemo(
    () => items
      .filter((item): item is Extract<FolioArrangementItem, { kind: 'article' }> => item.kind === 'article')
      .map(item => item.articleId),
    [items],
  );
  const lineupIssue = useMemo(
    () => (issue ? { ...issue, externalArticles: externalArticlesState } : null),
    [externalArticlesState, issue],
  );
  const articleCount = items.filter(item => item.kind === 'article').length;
  const defaultFolioItemIds = useMemo(
    () => (issue ? buildDefaultFolioArrangementItems(issue).map(item => item.id).join('|') : ''),
    [issue],
  );
  /** True once the user has actually put something of their own into the folio. */
  const hasFolioContent = items.length > 0 && (
    articleCount > 0
    || items.some(item => item.kind === 'matter' && Boolean(item.file))
    || items.map(item => item.id).join('|') !== defaultFolioItemIds
  );
  const pagesAdded = items.reduce(
    (sum, item) => sum + getFolioItemPageCount(item, articlesById),
    0,
  );
  const missingRequiredLabels = getMissingRequiredUploadLabels(items);
  const canSubmit = missingRequiredLabels.length === 0;
  const needsMoreArticles = articleCount < MIN_FOLIO_CONFIRM_ARTICLES;
  const confirmBlockedReason = missingRequiredLabels.length > 0
    ? needsMoreArticles
      ? `Upload ${missingRequiredLabels.join(', ')} and add necessary articles for confirming the folio`
      : `Upload ${missingRequiredLabels.join(', ')} for confirming the folio`
    : needsMoreArticles
      ? 'Add necessary articles for confirming the folio'
      : '';
  const canConfirmFolio = confirmBlockedReason === '';
  const availableAddItemTypes = useMemo(() => {
    const pool = addItemModalTarget?.allowedCategories ?? ADD_ITEM_MATTER_TYPES;
    return pool.filter(type => (
      addItemModalTarget?.allowedCategories
      || !SINGLE_INSTANCE_MATTER_TYPES.includes(type)
      || !items.some(item => item.kind === 'matter' && item.matterType === type)
    ));
  }, [addItemModalTarget?.allowedCategories, items]);
  const selectedAddItemNeedsFile = selectedAddItemType ? requiresFolioFile(selectedAddItemType) : false;
  const canAddSelectedItem = Boolean(selectedAddItemType) && (!selectedAddItemNeedsFile || Boolean(selectedAddItemFile));
  const showFolioShell = !addItemModalTarget && !addArticleModalTarget;

  useEffect(() => {
    onNestedModalOpenChange?.(!showFolioShell);
  }, [onNestedModalOpenChange, showFolioShell]);

  useEffect(() => {
    if (!isOpen || !issue) return;
    const external = issue.externalArticles ?? [];
    const byId = buildArticlesById(getLineupArticlesForJournal(issue.journalId, external));
    setExternalArticlesState(external);
    setItems(recalculateFolioPageRanges(buildDefaultItems(issue), byId));
    setValidationMessage('');
    setIsAddMenuOpen(false);
    setAddItemModalTarget(null);
    setAddArticleModalTarget(null);
    setSelectedAddItemType('');
    setSelectedAddItemFile(current => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
        fileObjectUrlsRef.current.delete(current.objectUrl);
      }
      return null;
    });
    setIsAddItemCategoryOpen(false);
    setIsReturningFromAddItem(false);
    setIsReturningFromAddArticle(false);
    setIsClosingAddArticle(false);
    setDismissedGapSuggestionIds(new Set());
  }, [isOpen, issue]);

  useEffect(() => {
    setDismissedGapSuggestionIds(prev => {
      const next = new Set(prev);
      pruneDismissedGapSuggestions(items, articlesById, next);
      return next.size === prev.size && [...next].every(id => prev.has(id)) ? prev : next;
    });
  }, [articlesById, items]);

  useEffect(() => {
    // Embedded mode lives inside another dialog that already locks page scroll.
    if (!isOpen || embedded) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [embedded, isOpen]);

  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isAddMenuOpen]);

  useEffect(() => () => {
    if (addArticleCloseTimeoutRef.current !== null) {
      window.clearTimeout(addArticleCloseTimeoutRef.current);
      addArticleCloseTimeoutRef.current = null;
    }
    fileObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    fileObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!addItemModalTarget) return;

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseAddItemModal();
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [addItemModalTarget]);

  useEffect(() => {
    if (!isReturningFromAddItem && !isReturningFromAddArticle) return;

    const timeoutId = window.setTimeout(() => {
      setIsReturningFromAddItem(false);
      setIsReturningFromAddArticle(false);
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [isReturningFromAddArticle, isReturningFromAddItem]);

  const handleAcceptGapSuggestion = useCallback((suggestion: FolioPageGapSuggestion) => {
    setIsReturningFromAddItem(false);
    setAddItemModalTarget({
      insertBeforeIndex: suggestion.insertBeforeIndex,
      gapSuggestionId: suggestion.id,
      allowedCategories: GAP_SUGGESTION_CATEGORIES,
    });
    setSelectedAddItemType('');
    setSelectedAddItemFile(current => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
        fileObjectUrlsRef.current.delete(current.objectUrl);
      }
      return null;
    });
    setIsAddItemCategoryOpen(false);
    setIsAddMenuOpen(false);
    setValidationMessage('');
  }, []);

  const handleRejectGapSuggestion = useCallback((suggestion: FolioPageGapSuggestion) => {
    setDismissedGapSuggestionIds(prev => new Set(prev).add(suggestion.id));
  }, []);

  if (!isOpen || !issue) return null;

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return recalculateFolioPageRanges(next, articlesById);
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => recalculateFolioPageRanges(prev.filter(item => item.id !== itemId), articlesById));
  };

  const revokeFolioFileAttachment = (file?: FolioFileAttachment | null) => {
    if (!file?.objectUrl) return;
    URL.revokeObjectURL(file.objectUrl);
    fileObjectUrlsRef.current.delete(file.objectUrl);
  };

  const clearSelectedAddItemFile = () => {
    setSelectedAddItemFile(current => {
      revokeFolioFileAttachment(current);
      return null;
    });
  };

  const buildFolioFileAttachment = async (file: File): Promise<FolioFileAttachment | null> => {
    const extension = getFileExtension(file.name);
    if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      setValidationMessage('Only DOCX, PDF, or XLSX files can be uploaded.');
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      setValidationMessage('File size must be 10 MB or less.');
      return null;
    }

    const pageCount = extension === 'pdf' ? await countPdfPages(file) : undefined;
    const objectUrl = URL.createObjectURL(file);
    fileObjectUrlsRef.current.add(objectUrl);

    setValidationMessage('');
    return {
      name: file.name,
      size: file.size,
      type: file.type || extension.toUpperCase(),
      pageCount,
      objectUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: getCurrentUser()?.name ?? 'John Doe',
    };
  };

  const handleFileChange = async (itemId: string, file: File) => {
    const attachment = await buildFolioFileAttachment(file);
    if (!attachment) return;

    setItems(prev => recalculateFolioPageRanges(
      prev.map(item => (
        item.kind === 'matter' && item.id === itemId
          ? (() => {
              revokeFolioFileAttachment(item.file);
              return { ...item, file: attachment };
            })()
          : item
      )),
      articlesById,
    ));
  };

  const handleRemoveFile = (itemId: string) => {
    setValidationMessage('');
    setItems(prev => recalculateFolioPageRanges(
      prev.map(item => (
        item.kind === 'matter' && item.id === itemId
          ? (() => {
              if (item.file?.objectUrl) {
                URL.revokeObjectURL(item.file.objectUrl);
                fileObjectUrlsRef.current.delete(item.file.objectUrl);
              }

              return { id: item.id, kind: item.kind, matterType: item.matterType };
            })()
          : item
      )),
      articlesById,
    ));
  };

  const handleOpenAddItemModal = (insertAfterIndex?: number) => {
    setIsReturningFromAddItem(false);
    setAddItemModalTarget({ insertAfterIndex });
    setSelectedAddItemType('');
    clearSelectedAddItemFile();
    setIsAddItemCategoryOpen(false);
    setIsAddMenuOpen(false);
    setValidationMessage('');
  };

  const handleCloseAddItemModal = (options?: { keepSelectedFile?: boolean }) => {
    setIsReturningFromAddItem(true);
    setAddItemModalTarget(null);
    setSelectedAddItemType('');
    if (options?.keepSelectedFile) {
      setSelectedAddItemFile(null);
    } else {
      clearSelectedAddItemFile();
    }
    setIsAddItemCategoryOpen(false);
  };

  const handleSelectAddItemType = (type: FolioMatterType) => {
    setSelectedAddItemType(type);
    setIsAddItemCategoryOpen(false);
    setValidationMessage('');
    if (type === 'blank') {
      clearSelectedAddItemFile();
    }
  };

  const handleAddItemFile = async (file: File) => {
    const attachment = await buildFolioFileAttachment(file);
    if (!attachment) return;

    setSelectedAddItemFile(current => {
      revokeFolioFileAttachment(current);
      return attachment;
    });
  };

  const handleAddItemInputFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleAddItemFile(file);
    event.target.value = '';
  };

  const handleDropAddItemFile = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void handleAddItemFile(file);
  };

  const handleOpenSelectedAddItemFile = () => {
    if (!selectedAddItemFile?.objectUrl) return;
    window.open(selectedAddItemFile.objectUrl, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmAddItem = () => {
    if (!selectedAddItemType || !addItemModalTarget) return;
    if (selectedAddItemNeedsFile && !selectedAddItemFile) {
      setValidationMessage(`Upload a file for ${FOLIO_MATTER_LABELS[selectedAddItemType].label}.`);
      return;
    }

    const gapSuggestionId = addItemModalTarget.gapSuggestionId;
    setValidationMessage('');
    setItems(prev => {
      const next = [...prev];
      const newItem = addableMatterItem(selectedAddItemType, selectedAddItemFile ?? undefined);
      const insertAt = addItemModalTarget.insertBeforeIndex ?? (
        addItemModalTarget.insertAfterIndex === undefined
          ? next.length
          : addItemModalTarget.insertAfterIndex + 1
      );
      next.splice(insertAt, 0, newItem);
      return recalculateFolioPageRanges(next, articlesById);
    });
    if (gapSuggestionId) {
      setDismissedGapSuggestionIds(prev => new Set(prev).add(gapSuggestionId));
    }
    handleCloseAddItemModal({ keepSelectedFile: true });
  };

  const handleOpenAddArticleFlow = (flow: AddArticleFlow, insertAfterIndex?: number) => {
    if (addArticleCloseTimeoutRef.current !== null) {
      window.clearTimeout(addArticleCloseTimeoutRef.current);
      addArticleCloseTimeoutRef.current = null;
    }
    setIsReturningFromAddArticle(false);
    setIsClosingAddArticle(false);
    setAddArticleModalTarget({ insertAfterIndex, flow });
    setIsAddMenuOpen(false);
    setValidationMessage('');
  };

  const handleCloseAddArticleModal = () => {
    setIsReturningFromAddArticle(true);
    setIsClosingAddArticle(true);
    if (addArticleCloseTimeoutRef.current !== null) {
      window.clearTimeout(addArticleCloseTimeoutRef.current);
    }
    addArticleCloseTimeoutRef.current = window.setTimeout(() => {
      setAddArticleModalTarget(null);
      setIsClosingAddArticle(false);
      setIsReturningFromAddArticle(false);
      addArticleCloseTimeoutRef.current = null;
    }, 180);
  };

  const handleConfirmAddArticles = (_issueId: string, articleIds: string[], externalArticles?: Article[]) => {
    const nextExternalArticles = externalArticles ?? externalArticlesState;
    if (externalArticles) {
      setExternalArticlesState(externalArticles);
    }
    const lookup = buildArticlesById(
      issue ? getLineupArticlesForJournal(issue.journalId, nextExternalArticles) : [],
    );

    setItems(prev => {
      const selectedArticleIds = new Set(articleIds);
      const targetIndex = addArticleModalTarget?.insertAfterIndex;
      const anchorItemId = targetIndex === undefined ? undefined : prev[targetIndex]?.id;
      const retainedItems = prev.filter(item => item.kind !== 'article' || selectedArticleIds.has(item.articleId));
      const retainedArticleIds = new Set(
        retainedItems
          .filter((item): item is Extract<FolioArrangementItem, { kind: 'article' }> => item.kind === 'article')
          .map(item => item.articleId),
      );
      const newArticleItems = articleIds
        .filter(articleId => !retainedArticleIds.has(articleId) && Boolean(lookup[articleId]))
        .map(articleItem);

      if (newArticleItems.length > 0) {
        const anchorIndex = anchorItemId
          ? retainedItems.findIndex(item => item.id === anchorItemId)
          : -1;
        const insertAt = targetIndex === undefined
          ? retainedItems.length
          : anchorIndex >= 0
            ? anchorIndex + 1
            : Math.min(targetIndex + 1, retainedItems.length);

        retainedItems.splice(insertAt, 0, ...newArticleItems);
      }

      return recalculateFolioPageRanges(retainedItems, lookup);
    });
    setValidationMessage('');
    setAddArticleModalTarget(null);
    setIsClosingAddArticle(false);
    setIsReturningFromAddArticle(false);
    if (addArticleCloseTimeoutRef.current !== null) {
      window.clearTimeout(addArticleCloseTimeoutRef.current);
      addArticleCloseTimeoutRef.current = null;
    }
  };

  const handleAddNewExternalArticle = (article: Article) => {
    if (!issue) return;

    const nextExternalArticles = [
      ...externalArticlesState.filter(existing => existing.id !== article.id),
      article,
    ];
    const lookup = buildArticlesById(getLineupArticlesForJournal(issue.journalId, nextExternalArticles));
    setExternalArticlesState(nextExternalArticles);

    setItems(prev => {
      const targetIndex = addArticleModalTarget?.insertAfterIndex;
      const anchorItemId = targetIndex === undefined ? undefined : prev[targetIndex]?.id;
      const retainedItems = [...prev];
      const newItem = articleItem(article.id);
      const anchorIndex = anchorItemId
        ? retainedItems.findIndex(item => item.id === anchorItemId)
        : -1;
      const insertAt = targetIndex === undefined
        ? retainedItems.length
        : anchorIndex >= 0
          ? anchorIndex + 1
          : Math.min(targetIndex + 1, retainedItems.length);

      retainedItems.splice(insertAt, 0, newItem);
      return recalculateFolioPageRanges(retainedItems, lookup);
    });

    setAddArticleModalTarget(null);
    setValidationMessage('');
  };

  const handleSubmit = () => {
    if (!hasRequiredUploads(items)) {
      setValidationMessage(`Upload files for: ${missingRequiredLabels.join(', ')}.`);
      return;
    }
    if (createWizard && !canConfirmFolio) {
      setValidationMessage(confirmBlockedReason);
      return;
    }
    setValidationMessage('');
    const actor = getCurrentUser()?.name ?? 'John Doe';
    onSave(issue.id, {
      items: removeTemporaryFileUrls(items),
      submittedAt: new Date().toISOString(),
      submittedBy: actor,
    }, externalArticlesState.length > 0 ? externalArticlesState : undefined);
    if (!createWizard) {
      onClose();
    }
  };

  const buildCurrentArrangement = (): FolioArrangement => ({
    items: removeTemporaryFileUrls(items),
    submittedAt: new Date().toISOString(),
    submittedBy: getCurrentUser()?.name ?? 'John Doe',
  });

  const handleWizardSaveDraft = () => {
    if (!createWizard) return;
    setValidationMessage('');
    createWizard.onSaveDraft(
      issue.id,
      buildCurrentArrangement(),
      externalArticlesState.length > 0 ? externalArticlesState : undefined,
    );
  };

  const handleWizardClose = () => {
    if (createWizard) {
      createWizard.onBack();
      return;
    }
    onClose();
  };

  return (
    <div
      className={[
        embedded ? 'folio-arrange-embedded' : 'folio-arrange-overlay',
        !embedded && !showFolioShell ? 'folio-arrange-overlay--child-active' : '',
      ].filter(Boolean).join(' ')}
      role="presentation"
    >
      {showFolioShell && (
        <section
          className={[
            embedded ? 'folio-arrange-inline' : 'folio-arrange-modal',
            isReturningFromAddItem ? 'folio-arrange-modal--returning' : '',
            isReturningFromAddArticle ? 'folio-arrange-modal--article-returning' : '',
          ].filter(Boolean).join(' ')}
          role={embedded ? 'group' : 'dialog'}
          aria-modal={embedded ? undefined : true}
          aria-labelledby="folio-arrange-title"
        >
          {embedded ? (
            <h2 id="folio-arrange-title" className="folio-arrange-inline-heading">Folio Creation</h2>
          ) : (
            <header className="folio-arrange-header">
              <h2 id="folio-arrange-title">{createWizard ? 'Folio Creation' : 'Arrange Folio'}</h2>
              <button type="button" className="folio-arrange-icon-button" aria-label="Close arrange folio" onClick={handleWizardClose}>
                <span aria-hidden>×</span>
              </button>
            </header>
          )}

          <main className="folio-arrange-body">
            <div className="folio-arrange-toolbar">
              <h3>Folio</h3>
              <div className="folio-arrange-add-control" ref={addMenuRef}>
                <button
                  type="button"
                  className="folio-arrange-add"
                  aria-haspopup="menu"
                  aria-expanded={isAddMenuOpen}
                  aria-controls={isAddMenuOpen ? 'folio-arrange-add-menu' : undefined}
                  onClick={() => setIsAddMenuOpen(prev => !prev)}
                >
                  <span className="folio-arrange-add-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4.17v11.66M4.17 10h11.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  Add
                </button>
                {isAddMenuOpen && (
                  <div id="folio-arrange-add-menu" className="folio-arrange-add-menu" role="menu">
                    <button type="button" className="folio-arrange-add-menu-item" role="menuitem" onClick={() => handleOpenAddItemModal()}>
                      Add Item
                    </button>
                    <button
                      type="button"
                      className="folio-arrange-add-menu-item"
                      role="menuitem"
                      onClick={() => handleOpenAddArticleFlow('picker')}
                    >
                      Add from available article
                    </button>
                    <button
                      type="button"
                      className="folio-arrange-add-menu-item"
                      role="menuitem"
                      onClick={() => handleOpenAddArticleFlow('new')}
                    >
                      Add new article
                    </button>
                  </div>
                )}
              </div>
            </div>

            <DndProvider backend={HTML5Backend}>
              <FolioArrangeTable
                items={items}
                articlesById={articlesById}
                dismissedGapSuggestionIds={dismissedGapSuggestionIds}
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveItem}
                onFileChange={handleFileChange}
                onRemoveFile={handleRemoveFile}
                onOpenAddItemModal={handleOpenAddItemModal}
                onAddArticleFromAvailableAfter={index => handleOpenAddArticleFlow('picker', index)}
                onAddNewArticleAfter={index => handleOpenAddArticleFlow('new', index)}
                onAcceptGapSuggestion={handleAcceptGapSuggestion}
                onRejectGapSuggestion={handleRejectGapSuggestion}
              />
            </DndProvider>
          </main>

          <footer className="folio-arrange-summary">
            <div className="folio-arrange-summary-title">
              <strong>Summary</strong>
            </div>
            <div className="folio-arrange-summary-stats">
              <span><strong>{articleCount}</strong> Articles</span>
              <span><strong>{pagesAdded}</strong> Pages Added</span>
              <span><strong>{PAGE_BUDGET}</strong> Issue budget</span>
            </div>
          </footer>

          <div className={`folio-arrange-footer${createWizard ? ' folio-arrange-footer--wizard' : ''}`}>
            {validationMessage && !createWizard && (
              <p className="folio-arrange-validation" role="alert">{validationMessage}</p>
            )}
            {createWizard ? (
              <>
                <button type="button" className="folio-arrange-secondary" onClick={createWizard.onBack}>
                  Back
                </button>
                <div className="folio-arrange-footer-actions">
                  {validationMessage && (
                    <p className="folio-arrange-validation" role="alert">{validationMessage}</p>
                  )}
                  {hasFolioContent ? (
                    <>
                      <button type="button" className="folio-arrange-secondary" onClick={handleWizardSaveDraft}>
                        Save Folio as draft
                      </button>
                      <span className="folio-confirm-wrap">
                        <button
                          type="button"
                          className="folio-arrange-primary"
                          disabled={!canConfirmFolio}
                          aria-describedby={canConfirmFolio ? undefined : 'folio-confirm-tooltip'}
                          onClick={handleSubmit}
                        >
                          Confirm Folio
                        </button>
                        {!canConfirmFolio && (
                          <span className="folio-confirm-tooltip" id="folio-confirm-tooltip" role="tooltip">
                            {confirmBlockedReason}
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <button type="button" className="folio-arrange-primary" onClick={createWizard.onProceed}>
                      Proceed
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button type="button" className="folio-arrange-primary" disabled={!canSubmit} onClick={handleSubmit}>
                Submit
              </button>
            )}
          </div>
        </section>
      )}

      {addItemModalTarget && (
        <div
          className={`folio-add-item-overlay${embedded ? ' folio-add-item-overlay--standalone' : ''}`}
          role="presentation"
          onMouseDown={() => handleCloseAddItemModal()}
        >
          <section
            className="folio-add-item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="folio-add-item-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="folio-add-item-header">
              <button type="button" className="folio-add-item-back" aria-label="Back to folio arrangement" onClick={() => handleCloseAddItemModal()}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 id="folio-add-item-title">Add Item</h2>
            </header>

            <div className="folio-add-item-body">
              <div className="folio-add-item-field">
                <label className="folio-add-item-label" htmlFor="folio-add-item-category">
                  Category <span aria-hidden>*</span>
                </label>
                <div className="folio-add-item-select">
                  <button
                    id="folio-add-item-category"
                    type="button"
                    className="folio-add-item-select-button"
                    aria-haspopup="listbox"
                    aria-expanded={isAddItemCategoryOpen}
                    onClick={() => setIsAddItemCategoryOpen(prev => !prev)}
                  >
                    <span className={selectedAddItemType ? 'folio-add-item-select-value' : 'folio-add-item-select-placeholder'}>
                      {selectedAddItemType ? FOLIO_MATTER_LABELS[selectedAddItemType].label : 'Select Category'}
                    </span>
                    <svg className={isAddItemCategoryOpen ? 'folio-add-item-select-chevron folio-add-item-select-chevron--open' : 'folio-add-item-select-chevron'} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isAddItemCategoryOpen && (
                    <div className="folio-add-item-select-menu" role="listbox" aria-label="Item category">
                      {availableAddItemTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          className="folio-add-item-select-option"
                          role="option"
                          aria-selected={selectedAddItemType === type}
                          onClick={() => handleSelectAddItemType(type)}
                        >
                          {FOLIO_MATTER_LABELS[type].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedAddItemType && selectedAddItemType !== 'blank' && (
                <div className="folio-add-item-field">
                  <span className="folio-add-item-label">
                    Upload File {selectedAddItemNeedsFile && <span aria-hidden>*</span>}
                  </span>
                  {selectedAddItemFile ? (
                    <div className="folio-arrange-file-card folio-add-item-file-card">
                      <div className="folio-arrange-file-card-header">
                        <button
                          type="button"
                          className="folio-arrange-file-name"
                          aria-label={`Open ${selectedAddItemFile.name} in a new tab`}
                          title="Open uploaded file in a new tab"
                          disabled={!selectedAddItemFile.objectUrl}
                          onClick={handleOpenSelectedAddItemFile}
                        >
                          {selectedAddItemFile.name}
                        </button>
                        <div className="folio-arrange-file-actions" aria-label="File actions">
                          <button
                            type="button"
                            className="folio-arrange-file-action folio-arrange-file-action--delete"
                            aria-label={`Remove ${selectedAddItemFile.name}`}
                            onClick={clearSelectedAddItemFile}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" fill="currentColor" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span className="folio-arrange-file-meta">Ready to add</span>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={addItemFileInputRef}
                        type="file"
                        accept=".doc,.docx,.pdf,.xls,.xlsx"
                        className="folio-arrange-file-input"
                        onChange={handleAddItemInputFile}
                      />
                      <button
                        type="button"
                        className="folio-add-item-upload"
                        onClick={() => addItemFileInputRef.current?.click()}
                        onDragOver={event => event.preventDefault()}
                        onDrop={handleDropAddItemFile}
                      >
                        <span className="folio-add-item-upload-icon" aria-hidden>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 13.33V4.17m0 0L6.67 7.5M10 4.17l3.33 3.33M5 15.83h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span>Drag and drop file or <u>Browse</u></span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <footer className="folio-add-item-actions">
              {validationMessage && (
                <p className="folio-add-item-validation" role="alert">{validationMessage}</p>
              )}
              <button
                type="button"
                className="folio-add-item-submit"
                disabled={!canAddSelectedItem}
                onClick={handleConfirmAddItem}
              >
                Add
              </button>
            </footer>
          </section>
        </div>
      )}

      <ArticleLineupModal
        isOpen={Boolean(addArticleModalTarget?.flow === 'picker')}
        issue={lineupIssue}
        title="Add from available article"
        headerAction="back"
        initialArticleIds={currentFolioArticleIds}
        externalArticles={externalArticlesState}
        enableAddMenu
        manageBodyScroll={false}
        isClosing={isClosingAddArticle}
        onClose={handleCloseAddArticleModal}
        onConfirm={handleConfirmAddArticles}
      />

      <AddNewArticleModal
        isOpen={Boolean(addArticleModalTarget?.flow === 'new')}
        journalId={issue?.journalId ?? ''}
        existingArticleIds={availableArticles.map(article => article.id)}
        onClose={handleCloseAddArticleModal}
        onAdd={handleAddNewExternalArticle}
      />
    </div>
  );
};

export default FolioArrangeModal;
