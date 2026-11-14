export {
  PAGE_ILLUSTRATION_DEFAULT_COLOR,
  PAGE_ILLUSTRATION_DEFAULT_LINE_WIDTH,
  PAGE_ILLUSTRATION_FRAME_TITLE,
} from './constants';
export { clientToPageContentPoint, isNearPolyline } from './coords';
export {
  addPageIllustrationBrush,
  deletePageIllustrationBrush,
  ensurePageIllustrationFrame,
  findPageIllustrationFrame,
  isPageIllustrationFrame,
  listPageIllustrationBrushes,
  migrateLegacyIllustrationStrokes,
} from './frame';
export { PageIllustrationOverlay } from './overlay';
