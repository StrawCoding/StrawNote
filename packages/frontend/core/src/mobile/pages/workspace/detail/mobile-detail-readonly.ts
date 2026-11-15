import type { DocMode } from '@blocksuite/affine/model';

/**
 * Mobile doc readonly: keyboard toolbar only gates page (rich text), not edgeless / illustration.
 */
export function computeMobileDetailReadonly(params: {
  canEdit: boolean;
  isInTrash: boolean;
  mode: DocMode;
  enableKeyboardToolbar: boolean;
  enableEdgelessEditing: boolean;
}): boolean {
  const {
    canEdit,
    isInTrash,
    mode,
    enableKeyboardToolbar,
    enableEdgelessEditing,
  } = params;

  if (!canEdit || isInTrash) return true;
  if (mode === 'edgeless') return !enableEdgelessEditing;
  if (mode === 'illustration') return false;
  if (mode === 'page') return !enableKeyboardToolbar;
  return false;
}
