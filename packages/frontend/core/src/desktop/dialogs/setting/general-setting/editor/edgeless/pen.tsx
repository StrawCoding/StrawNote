import { MenuItem, MenuTrigger, Slider, Switch } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { parseHexColor } from '@affine/core/blocksuite/page-illustration/coords';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { useI18n } from '@affine/i18n';
import { getSurfaceBlock } from '@blocksuite/affine/blocks/surface';
import { DefaultTheme } from '@blocksuite/affine/model';
import type { Store } from '@blocksuite/affine/store';
import { useFramework, useLiveData } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DropdownMenu } from '../menu';
import { menuTrigger } from '../style.css';
import { usePalettes } from '../utils';
import { Point } from './point';
import { EdgelessSnapshot } from './snapshot';

export const PenSettings = () => {
  const t = useI18n();
  const framework = useFramework();
  const { editorSetting } = framework.get(EditorSettingService);
  const settings = useLiveData(editorSetting.settings$);
  const { palettes, getCurrentColor } = usePalettes(
    DefaultTheme.Palettes,
    DefaultTheme.black
  );

  const currentColor = useMemo(() => {
    return getCurrentColor(settings.brush.color);
  }, [getCurrentColor, settings.brush.color]);

  const colorItems = useMemo(() => {
    const { color } = settings.brush;
    return palettes.map(({ key, value, resolvedValue }) => {
      const handler = () => {
        editorSetting.set('brush', { color: value });
      };
      const isSelected = isEqual(color, value);
      return (
        <MenuItem
          key={key}
          onSelect={handler}
          selected={isSelected}
          prefix={<Point color={resolvedValue} />}
        >
          {key}
        </MenuItem>
      );
    });
  }, [editorSetting, settings.brush, palettes]);

  const borderThickness = settings.brush.lineWidth;
  const setBorderThickness = useCallback(
    (value: number[]) => {
      editorSetting.set('brush', {
        lineWidth: value[0],
      });
    },
    [editorSetting]
  );

  const streamline = settings.brush.streamline ?? 0.5;
  const setStreamline = useCallback(
    (value: number[]) => {
      editorSetting.set('brush', {
        streamline: value[0] / 100,
      });
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

  const fingerPanOnly = settings.stylus?.fingerPanOnly ?? true;
  const setFingerPanOnly = useCallback(
    (checked: boolean) => {
      editorSetting.set('stylus', { fingerPanOnly: checked });
    },
    [editorSetting]
  );

  const buttonMode = settings.stylus?.buttonMode ?? 'both';
  const buttonModeItems = useMemo(() => {
    const options = [
      {
        value: 'both' as const,
        label: t['com.affine.mobile.setting.pen.button-mode.both'](),
      },
      {
        value: 'toggle' as const,
        label: t['com.affine.mobile.setting.pen.button-mode.toggle'](),
      },
      {
        value: 'hold' as const,
        label: t['com.affine.mobile.setting.pen.button-mode.hold'](),
      },
    ];
    return options.map(item => (
      <MenuItem
        key={item.value}
        selected={buttonMode === item.value}
        onSelect={() => editorSetting.set('stylus', { buttonMode: item.value })}
      >
        {item.label}
      </MenuItem>
    ));
  }, [buttonMode, editorSetting, t]);

  const buttonModeLabel = useMemo(() => {
    if (buttonMode === 'toggle') {
      return t['com.affine.mobile.setting.pen.button-mode.toggle']();
    }
    if (buttonMode === 'hold') {
      return t['com.affine.mobile.setting.pen.button-mode.hold']();
    }
    return t['com.affine.mobile.setting.pen.button-mode.both']();
  }, [buttonMode, t]);

  const getElements = useCallback((doc: Store) => {
    const surface = getSurfaceBlock(doc);
    return surface?.getElementsByType('brush') || [];
  }, []);

  return (
    <>
      <EdgelessSnapshot
        title={t['com.affine.settings.editorSettings.edgeless.pen']()}
        docName="pen"
        keyName="brush"
        getElements={getElements}
      />
      <SettingRow
        name={t['com.affine.settings.editorSettings.edgeless.pen.color']()}
        desc={''}
      >
        {currentColor ? (
          <DropdownMenu
            items={colorItems}
            trigger={
              <MenuTrigger
                className={menuTrigger}
                prefix={<Point color={currentColor.resolvedValue} />}
              >
                {currentColor.key}
              </MenuTrigger>
            }
          />
        ) : null}
      </SettingRow>
      <SettingRow name={t['com.affine.mobile.setting.pen.hex']()} desc={''}>
        <input
          data-testid="desktop-pen-hex"
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
            width: 110,
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
      </SettingRow>
      <SettingRow
        name={t['com.affine.settings.editorSettings.edgeless.pen.thickness']()}
        desc={''}
      >
        <Slider
          value={[borderThickness]}
          onValueChange={setBorderThickness}
          min={2}
          max={12}
          step={2}
          nodes={[2, 4, 6, 8, 10, 12]}
        />
      </SettingRow>
      <SettingRow
        name={t['com.affine.settings.editorSettings.edgeless.pen.stability']()}
        desc={t[
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
      </SettingRow>
      <SettingRow
        name={t['com.affine.mobile.setting.pen.finger-pan-only']()}
        desc={t['com.affine.mobile.setting.pen.finger-pan-only.desc']()}
      >
        <Switch
          data-testid="desktop-pen-finger-pan-only"
          checked={fingerPanOnly}
          onChange={setFingerPanOnly}
        />
      </SettingRow>
      <SettingRow
        name={t['com.affine.mobile.setting.pen.button-mode']()}
        desc={t['com.affine.mobile.setting.pen.button-mode.desc']()}
      >
        <DropdownMenu
          items={buttonModeItems}
          trigger={
            <MenuTrigger className={menuTrigger}>{buttonModeLabel}</MenuTrigger>
          }
        />
      </SettingRow>
    </>
  );
};
