import type { DocMode } from '@blocksuite/affine/model';

/** Mobile edgeless uses StylusInkToolbar instead of BlockSuite bottom chrome. */
export function shouldUseEdgelessMobileInkChrome(
  mode: DocMode,
  readonly?: boolean
): boolean {
  return BUILD_CONFIG.isMobileEdition && mode === 'edgeless' && !readonly;
}
