import { RadioGroup, type RadioItem } from '@affine/component';
import { registerAffineCommand } from '@affine/core/commands';
import { EditorService } from '@affine/core/modules/editor';
import { ViewService, WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import {
  type DocMode,
  isCanvasEditorMode,
  isPageEditorMode,
} from '@blocksuite/affine/model';
import { EdgelessIcon, PageIcon, PenIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback, useEffect, useMemo } from 'react';

import { switchItem } from './style.css';
import {
  EdgelessSwitchItem,
  IllustrationSwitchItem,
  PageSwitchItem,
} from './switch-items';

export interface EditorModeSwitchProps {
  pageId: string;
  isPublic?: boolean;
  publicMode?: DocMode;
}

const EdgelessRadioItem: RadioItem = {
  value: 'edgeless',
  label: <EdgelessSwitchItem />,
  testId: 'switch-edgeless-mode-button',
  className: switchItem,
};
const PageRadioItem: RadioItem = {
  value: 'page',
  label: <PageSwitchItem />,
  testId: 'switch-page-mode-button',
  className: switchItem,
};
const IllustrationRadioItem: RadioItem = {
  value: 'illustration',
  label: <IllustrationSwitchItem />,
  testId: 'switch-illustration-mode-button',
  className: switchItem,
};

export const EditorModeSwitch = () => {
  const t = useI18n();
  const editor = useService(EditorService).editor;
  const trash = useLiveData(editor.doc.trash$);
  const currentMode = useLiveData(editor.mode$);
  const view = useServiceOptional(ViewService)?.view;
  const workbench = useServiceOptional(WorkbenchService)?.workbench;
  const activeView = useLiveData(workbench?.activeView$);
  const isActiveView = activeView?.id && activeView?.id === view?.id;

  const onModeChange = useCallback(
    (mode: DocMode) => {
      if (trash || currentMode === mode) return;
      editor.setMode(mode);
      editor.setSelector(undefined);
      track.$.header.actions.switchPageMode({ mode });
    },
    [currentMode, editor, trash]
  );

  const shouldHide = useCallback(
    (mode: DocMode) => trash && currentMode !== mode,
    [currentMode, trash]
  );

  useEffect(() => {
    if (trash || currentMode === undefined || !isActiveView) return;
    const nextMode: DocMode = isPageEditorMode(currentMode)
      ? 'edgeless'
      : 'page';
    return registerAffineCommand({
      id: 'affine:doc-mode-switch',
      category: 'editor:page',
      label:
        nextMode === 'edgeless'
          ? t['com.affine.cmdk.switch-to-edgeless']()
          : t['com.affine.cmdk.switch-to-page'](),
      icon: nextMode === 'edgeless' ? <EdgelessIcon /> : <PageIcon />,
      keyBinding: {
        binding: 'Alt+KeyS',
        capture: true,
      },
      run: () => onModeChange(nextMode),
    });
  }, [currentMode, isActiveView, onModeChange, t, trash]);

  useEffect(() => {
    if (trash || currentMode === undefined || !isActiveView) return;
    return registerAffineCommand({
      id: 'affine:doc-mode-illustration',
      category: 'editor:page',
      label: t['com.affine.header.mode-switch.illustration'](),
      icon: <PenIcon />,
      keyBinding: {
        binding: 'Alt+KeyI',
        capture: true,
      },
      run: () => onModeChange('illustration'),
    });
  }, [currentMode, isActiveView, onModeChange, t, trash]);

  return (
    <PureEditorModeSwitch
      mode={currentMode}
      setMode={onModeChange}
      hidePage={shouldHide('page')}
      hideEdgeless={shouldHide('edgeless')}
      hideIllustration={shouldHide('illustration')}
    />
  );
};

export interface PureEditorModeSwitchProps {
  mode?: DocMode;
  setMode?: (mode: DocMode) => void;
  hidePage?: boolean;
  hideEdgeless?: boolean;
  hideIllustration?: boolean;
}

export const PureEditorModeSwitch = ({
  mode,
  setMode,
  hidePage,
  hideEdgeless,
  hideIllustration,
}: PureEditorModeSwitchProps) => {
  const items = useMemo(
    () => [
      ...(hidePage ? [] : [PageRadioItem]),
      ...(hideIllustration ? [] : [IllustrationRadioItem]),
      ...(hideEdgeless ? [] : [EdgelessRadioItem]),
    ],
    [hideEdgeless, hideIllustration, hidePage]
  );
  return (
    <RadioGroup
      iconMode
      itemHeight={24}
      borderRadius={8}
      padding={4}
      gap={8}
      value={mode}
      items={items}
      onChange={setMode}
    />
  );
};

// re-export for callers that branch on canvas vs page
export { isCanvasEditorMode, isPageEditorMode };
