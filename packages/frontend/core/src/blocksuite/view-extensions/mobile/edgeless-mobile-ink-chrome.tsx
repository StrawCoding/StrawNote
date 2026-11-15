import { useSignalValue } from '@affine/core/modules/doc-info/utils';
import { EditorService } from '@affine/core/modules/editor';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { ColorScheme, resolveColor } from '@blocksuite/affine/model';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';
import { useLiveData, useService } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  gfxToolNameToInkTool,
  inkToolToGfxTool,
} from './edgeless-mobile-ink-tool';
import { type StylusInkTool, StylusInkToolbar } from './stylus-ink-toolbar';
import { INK_TOOL_PICK_EVENT } from './stylus-pen';

const EDGELESS_INK_DEFAULT_COLOR = '#000000';

export function EdgelessMobileInkChrome({ readonly }: { readonly?: boolean }) {
  const editor = useService(EditorService).editor;
  const editorContainer = useLiveData(editor.editorContainer$);
  const mode = useLiveData(editor.mode$);
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);
  const { resolvedTheme } = useTheme();
  const colorScheme =
    resolvedTheme === 'dark' ? ColorScheme.Dark : ColorScheme.Light;

  const gfx = useMemo(() => {
    try {
      return editorContainer?.host?.std.get(GfxControllerIdentifier) ?? null;
    } catch {
      return null;
    }
  }, [editorContainer]);

  const gfxToolName = useSignalValue(gfx?.tool.currentToolName$);
  const [tool, setTool] = useState<StylusInkTool>('brush');

  useEffect(() => {
    if (!gfxToolName) return;
    setTool(gfxToolNameToInkTool(gfxToolName));
  }, [gfxToolName]);

  const brushColor = useMemo(() => {
    try {
      return resolveColor(
        settings.brush.color,
        colorScheme,
        EDGELESS_INK_DEFAULT_COLOR
      );
    } catch {
      return EDGELESS_INK_DEFAULT_COLOR;
    }
  }, [colorScheme, settings.brush.color]);

  const brushLineWidth = settings.brush.lineWidth ?? 4;

  const onToolChange = useCallback(
    (next: StylusInkTool) => {
      setTool(next);
      if (!gfx) return;
      gfx.tool.setTool(inkToolToGfxTool(next));
      window.dispatchEvent(new CustomEvent(INK_TOOL_PICK_EVENT));
    },
    [gfx]
  );

  const onBrushColorChange = useCallback(
    (color: string) => {
      editorSetting.set('brush', { color });
    },
    [editorSetting]
  );

  const onBrushLineWidthChange = useCallback(
    (lineWidth: number) => {
      editorSetting.set('brush', { lineWidth });
    },
    [editorSetting]
  );

  const visible =
    BUILD_CONFIG.isMobileEdition &&
    mode === 'edgeless' &&
    !readonly &&
    !!editorContainer &&
    !!gfx;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.toggleAttribute('data-edgeless-ink-chrome', visible);
    return () => {
      delete document.body.dataset.edgelessInkChrome;
    };
  }, [visible]);

  if (!visible) return null;

  const toolbar = (
    <StylusInkToolbar
      tool={tool}
      onToolChange={onToolChange}
      brushColor={brushColor}
      onBrushColorChange={onBrushColorChange}
      brushLineWidth={brushLineWidth}
      onBrushLineWidthChange={onBrushLineWidthChange}
      showPan
      ariaLabel="Edgeless tools"
      testIdPrefix="edgeless-ink"
    />
  );

  return typeof document !== 'undefined'
    ? createPortal(toolbar, document.body)
    : null;
}
