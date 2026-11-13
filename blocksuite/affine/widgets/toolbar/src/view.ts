import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { toolbarWidget } from '.';
import { effects } from './effects';

export class ToolbarViewExtension extends ViewExtensionProvider {
  override name = 'affine-toolbar-widget';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    // Keep page-mode mobile free of the desktop selection toolbar, but enable
    // it on mobile-edgeless so Lock/Unlock (and other element actions) work.
    if (context.scope === 'mobile-page') return;
    context.register(toolbarWidget);
  }
}
