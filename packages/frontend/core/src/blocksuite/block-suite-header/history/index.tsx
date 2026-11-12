import { IconButton } from '@affine/component';
import { useSignalValue } from '@affine/core/modules/doc-info/utils';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { Store } from '@blocksuite/affine/store';
import { RedoIcon, UndoIcon } from '@blocksuite/icons/rc';
import { useCallback } from 'react';

import { isHistoryActionEnabled } from './history-buttons';
import * as styles from './styles.css';

export interface PageHistoryButtonsProps {
  page: Store;
}

/**
 * Header undo/redo for note (doc) history — web/desktop.
 * Uses the same Yjs UndoManager as Ctrl/Cmd+Z, covering page & edgeless edits.
 */
export const PageHistoryButtons = ({ page }: PageHistoryButtonsProps) => {
  const t = useI18n();
  const canUndoSignal = useSignalValue(page.history.canUndo$);
  const canRedoSignal = useSignalValue(page.history.canRedo$);
  const canUndo = isHistoryActionEnabled(page.readonly, !!canUndoSignal);
  const canRedo = isHistoryActionEnabled(page.readonly, !!canRedoSignal);

  const onUndo = useCallback(() => {
    if (!canUndo) return;
    track.$.header.actions.undo();
    page.undo();
  }, [canUndo, page]);

  const onRedo = useCallback(() => {
    if (!canRedo) return;
    track.$.header.actions.redo();
    page.redo();
  }, [canRedo, page]);

  return (
    <div className={styles.historyButtons} data-testid="header-history-buttons">
      <IconButton
        size="20"
        tooltip={t['com.affine.keyboardShortcuts.undo']()}
        tooltipShortcut={['$mod', 'Z']}
        data-testid="header-undo-button"
        aria-label={t['com.affine.keyboardShortcuts.undo']()}
        disabled={!canUndo}
        onClick={onUndo}
      >
        <UndoIcon />
      </IconButton>
      <IconButton
        size="20"
        tooltip={t['com.affine.keyboardShortcuts.redo']()}
        tooltipShortcut={['$mod', 'Shift', 'Z']}
        data-testid="header-redo-button"
        aria-label={t['com.affine.keyboardShortcuts.redo']()}
        disabled={!canRedo}
        onClick={onRedo}
      >
        <RedoIcon />
      </IconButton>
    </div>
  );
};
