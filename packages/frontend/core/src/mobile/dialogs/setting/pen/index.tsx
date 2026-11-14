import { Slider, Switch } from '@affine/component';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { useI18n } from '@affine/i18n';
import { DefaultTheme } from '@blocksuite/affine/model';
import { useLiveData, useService } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { parseHexColor } from '../../../../blocksuite/page-illustration/coords';
import { usePalettes } from '../../../../desktop/dialogs/setting/general-setting/editor/utils';
import { SettingDropdownSelect } from '../dropdown-select';
import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';

export const PenSettingGroup = () => {
  const t = useI18n();
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);
  const { palettes } = usePalettes(DefaultTheme.Palettes, DefaultTheme.black);

  const colorOptions = useMemo(
    () =>
      palettes.map(({ key, value }) => ({
        label: key,
        value: JSON.stringify(value),
      })),
    [palettes]
  );

  const colorValue = useMemo(() => {
    const match = palettes.find(({ value }) =>
      isEqual(value, settings.brush.color)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings.brush.color]);

  const setColor = useCallback(
    (serialized: string) => {
      try {
        editorSetting.set('brush', { color: JSON.parse(serialized) });
      } catch {
        // ignore invalid palette payloads
      }
    },
    [editorSetting]
  );

  const resolvedHex =
    typeof settings.brush.color === 'string' ? settings.brush.color : '';
  const [hexDraft, setHexDraft] = useState(
    resolvedHex.startsWith('#') ? resolvedHex : ''
  );
  useEffect(() => {
    setHexDraft(resolvedHex.startsWith('#') ? resolvedHex : '');
  }, [resolvedHex]);

  const commitHex = useCallback(() => {
    const parsed = parseHexColor(hexDraft);
    if (parsed) {
      editorSetting.set('brush', { color: parsed });
    } else {
      setHexDraft(resolvedHex.startsWith('#') ? resolvedHex : '');
    }
  }, [editorSetting, hexDraft, resolvedHex]);

  const thickness = settings.brush.lineWidth;
  const setThickness = useCallback(
    (value: number[]) => {
      editorSetting.set('brush', { lineWidth: value[0] });
    },
    [editorSetting]
  );

  const streamline = settings.brush.streamline ?? 0.5;
  const setStreamline = useCallback(
    (value: number[]) => {
      editorSetting.set('brush', { streamline: value[0] / 100 });
    },
    [editorSetting]
  );

  const fingerPanOnly = settings.stylus?.fingerPanOnly ?? true;
  const setFingerPanOnly = useCallback(
    (checked: boolean) => {
      editorSetting.set('stylus', { fingerPanOnly: checked });
    },
    [editorSetting]
  );

  const buttonMode = settings.stylus?.buttonMode ?? 'both';
  const buttonModeOptions = useMemo(
    () => [
      {
        label: t['com.affine.mobile.setting.pen.button-mode.both'](),
        value: 'both',
      },
      {
        label: t['com.affine.mobile.setting.pen.button-mode.toggle'](),
        value: 'toggle',
      },
      {
        label: t['com.affine.mobile.setting.pen.button-mode.hold'](),
        value: 'hold',
      },
    ],
    [t]
  );
  const setButtonMode = useCallback(
    (value: string) => {
      if (value === 'hold' || value === 'toggle' || value === 'both') {
        editorSetting.set('stylus', { buttonMode: value });
      }
    },
    [editorSetting]
  );

  return (
    <SettingGroup title={t['com.affine.mobile.setting.pen.title']()}>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.pen.color']()}
        description={t['com.affine.mobile.setting.pen.desc']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={colorValue}
          onChange={setColor}
        />
      </RowLayout>
      <RowLayout label={t['com.affine.mobile.setting.pen.hex']()}>
        <input
          data-testid="mobile-pen-hex"
          value={hexDraft}
          placeholder="#000000"
          onChange={e => setHexDraft(e.target.value)}
          onBlur={commitHex}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitHex();
            }
          }}
          style={{
            width: 96,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--affine-border-color)',
            background: 'var(--affine-background-primary-color)',
            color: 'var(--affine-text-primary-color)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            padding: '0 6px',
          }}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.pen.thickness']()}
      >
        <Slider
          value={[thickness]}
          onValueChange={setThickness}
          min={2}
          max={12}
          step={2}
          nodes={[2, 4, 6, 8, 10, 12]}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.pen.stability']()}
        description={t[
          'com.affine.settings.editorSettings.edgeless.pen.stability.desc'
        ]()}
      >
        <Slider
          value={[Math.round(streamline * 100)]}
          onValueChange={setStreamline}
          min={0}
          max={100}
          step={5}
          nodes={[0, 25, 50, 75, 100]}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.mobile.setting.pen.finger-pan-only']()}
        description={t['com.affine.mobile.setting.pen.finger-pan-only.desc']()}
      >
        <Switch
          data-testid="mobile-pen-finger-pan-only"
          checked={fingerPanOnly}
          onChange={setFingerPanOnly}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.mobile.setting.pen.button-mode']()}
        description={t['com.affine.mobile.setting.pen.button-mode.desc']()}
      >
        <SettingDropdownSelect
          options={buttonModeOptions}
          value={buttonMode}
          onChange={setButtonMode}
        />
      </RowLayout>
    </SettingGroup>
  );
};
