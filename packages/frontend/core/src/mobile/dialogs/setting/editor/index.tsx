import { Slider, Switch } from '@affine/component';
import {
  type EditorSettingSchema,
  EditorSettingService,
  type FontFamily,
  fontStyleOptions,
  type NewDocDateTitleFormat,
  newDocDateTitleFormatOptions,
} from '@affine/core/modules/editor-setting';
import { useI18n } from '@affine/i18n';
import { DefaultTheme } from '@blocksuite/affine/model';
import { ArrowRightSmallIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { useCallback, useMemo, useState } from 'react';

import { usePalettes } from '../../../../desktop/dialogs/setting/general-setting/editor/utils';
import { SettingDropdownSelect } from '../dropdown-select';
import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';
import { SwipeDialog } from '../swipe-dialog';

/**
 * Android / mobile editor settings — covers the same EditorSettingSchema keys
 * as the web Editor Settings (General + Page + Edgeless), excluding
 * desktop-only items (Linux middle-click paste, Electron custom font picker,
 * spell-check restart).
 */
export const EditorSettingGroup = () => {
  const [open, setOpen] = useState(false);
  const t = useI18n();
  const title = t['com.affine.mobile.setting.editor.entry']();

  return (
    <>
      <SettingGroup title={t['com.affine.mobile.setting.editor.title']()}>
        <RowLayout label={title} onClick={() => setOpen(true)}>
          <ArrowRightSmallIcon fontSize={22} />
        </RowLayout>
      </SettingGroup>
      <SwipeDialog open={open} onOpenChange={setOpen} title={title}>
        <MobileEditorSettingsBody />
      </SwipeDialog>
    </>
  );
};

const MobileEditorSettingsBody = () => {
  const t = useI18n();
  return (
    <div data-testid="mobile-editor-settings">
      <SettingGroup title={t['com.affine.mobile.setting.editor.general']()}>
        <GeneralMobileSettings />
      </SettingGroup>
      <SettingGroup title={t['com.affine.mobile.setting.editor.page']()}>
        <PageMobileSettings />
      </SettingGroup>
      <SettingGroup title={t['com.affine.mobile.setting.editor.edgeless']()}>
        <EdgelessMobileSettings />
      </SettingGroup>
    </div>
  );
};

const GeneralMobileSettings = () => {
  const t = useI18n();
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);

  const fontOptions = useMemo(
    () =>
      fontStyleOptions
        .filter(o => o.key !== 'Custom')
        .map(o => ({
          label: o.key,
          value: o.key,
        })),
    []
  );

  const modeOptions = useMemo(
    () => [
      { label: t['Page'](), value: 'page' },
      { label: t['Edgeless'](), value: 'edgeless' },
      {
        label: t['com.affine.settings.editorSettings.ask-me-every-time'](),
        value: 'ask',
      },
    ],
    [t]
  );

  const dateFormatOptions = useMemo(
    () =>
      newDocDateTitleFormatOptions.map(value => ({
        value,
        label: t.t(
          `com.affine.settings.editorSettings.general.auto-date-title.format.${value.toLowerCase()}` as
            | 'com.affine.settings.editorSettings.general.auto-date-title.format.dd-mm-yyyy'
            | 'com.affine.settings.editorSettings.general.auto-date-title.format.mm-dd-yyyy'
            | 'com.affine.settings.editorSettings.general.auto-date-title.format.yyyy-mm-dd'
            | 'com.affine.settings.editorSettings.general.auto-date-title.format.journal'
        ),
      })),
    [t]
  );

  return (
    <>
      <RowLayout
        label={t['com.affine.appearanceSettings.font.title']()}
        description={t['com.affine.appearanceSettings.font.description']()}
      >
        <SettingDropdownSelect
          options={fontOptions}
          value={settings.fontFamily}
          onChange={v => editorSetting.set('fontFamily', v as FontFamily)}
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.general.font-size.title'
        ]()}
      >
        <Slider
          value={[settings.fontSize]}
          min={12}
          max={24}
          step={1}
          onValueChange={v => {
            editorSetting.set('fontSize', v[0]);
            document.documentElement.style.setProperty(
              '--affine-font-base',
              `${v[0]}px`
            );
          }}
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.general.default-new-doc.title'
        ]()}
      >
        <SettingDropdownSelect
          options={modeOptions}
          value={settings.newDocDefaultMode}
          onChange={v =>
            editorSetting.set(
              'newDocDefaultMode',
              v as EditorSettingSchema['newDocDefaultMode']
            )
          }
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.general.auto-date-title.title'
        ]()}
      >
        <Switch
          checked={settings.autoTitleNewDocWithCurrentDate}
          onChange={checked =>
            editorSetting.set('autoTitleNewDocWithCurrentDate', checked)
          }
        />
      </RowLayout>
      {settings.autoTitleNewDocWithCurrentDate ? (
        <RowLayout
          label={t[
            'com.affine.settings.editorSettings.general.auto-date-title.format.title'
          ]()}
        >
          <SettingDropdownSelect
            options={dateFormatOptions}
            value={settings.newDocDateTitleFormat}
            onChange={v =>
              editorSetting.set(
                'newDocDateTitleFormat',
                v as NewDocDateTitleFormat
              )
            }
          />
        </RowLayout>
      ) : null}
      <RowLayout
        label={t.t(
          'com.affine.settings.editorSettings.general.add-icon-option.title'
        )}
      >
        <Switch
          checked={settings.displayAddIconOption}
          onChange={checked =>
            editorSetting.set('displayAddIconOption', checked)
          }
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.general.default-code-block.line-numbers.title'
        ]()}
      >
        <Switch
          data-testid="mobile-code-block-line-numbers"
          checked={settings.codeBlockLineNumbers}
          onChange={checked =>
            editorSetting.set('codeBlockLineNumbers', checked)
          }
        />
      </RowLayout>
    </>
  );
};

const PageMobileSettings = () => {
  const t = useI18n();
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);

  const widthOptions = useMemo(
    () => [
      {
        value: 'standard',
        label:
          t[
            'com.affine.settings.editorSettings.page.default-page-width.standard'
          ](),
      },
      {
        value: 'fullWidth',
        label:
          t[
            'com.affine.settings.editorSettings.page.default-page-width.full-width'
          ](),
      },
    ],
    [t]
  );

  return (
    <>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.page.default-page-width.title'
        ]()}
      >
        <SettingDropdownSelect
          options={widthOptions}
          value={settings.fullWidthLayout ? 'fullWidth' : 'standard'}
          onChange={v =>
            editorSetting.set('fullWidthLayout', v === 'fullWidth')
          }
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.page.display-doc-info.title'
        ]()}
      >
        <Switch
          checked={settings.displayDocInfo}
          onChange={checked => editorSetting.set('displayDocInfo', checked)}
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.page.display-bi-link.title'
        ]()}
      >
        <Switch
          checked={settings.displayBiDirectionalLink}
          onChange={checked =>
            editorSetting.set('displayBiDirectionalLink', checked)
          }
        />
      </RowLayout>
    </>
  );
};

const EdgelessMobileSettings = () => {
  const t = useI18n();
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(editorSetting.settings$);
  const { palettes } = usePalettes(DefaultTheme.Palettes, DefaultTheme.black);

  const themeOptions = useMemo(
    () => [
      {
        value: 'specified',
        label:
          t[
            'com.affine.settings.editorSettings.page.edgeless-default-theme.specified'
          ](),
      },
      { value: 'dark', label: t['com.affine.themeSettings.dark']() },
      { value: 'light', label: t['com.affine.themeSettings.light']() },
      { value: 'auto', label: t['com.affine.themeSettings.auto']() },
    ],
    [t]
  );

  const colorOptions = useMemo(
    () =>
      palettes.map(({ key, value }) => ({
        label: key,
        value: JSON.stringify(value),
      })),
    [palettes]
  );

  const frameBg = useMemo(() => {
    const match = palettes.find(({ value }) =>
      isEqual(value, settings['affine:frame']?.background)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings]);

  const setFrameBg = useCallback(
    (serialized: string) => {
      try {
        editorSetting.set('affine:frame', {
          background: JSON.parse(serialized),
        });
      } catch {
        // ignore
      }
    },
    [editorSetting]
  );

  const noteBg = useMemo(() => {
    const match = palettes.find(({ value }) =>
      isEqual(value, settings['affine:note']?.background)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings]);

  const setNoteBg = useCallback(
    (serialized: string) => {
      try {
        editorSetting.set('affine:note', {
          background: JSON.parse(serialized),
        });
      } catch {
        // ignore
      }
    },
    [editorSetting]
  );

  const textColor = useMemo(() => {
    const match = palettes.find(({ value }) =>
      isEqual(value, settings['affine:edgeless-text']?.color)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings]);

  const connectorStroke = useMemo(() => {
    const match = palettes.find(({ value }) =>
      isEqual(value, settings.connector?.stroke)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings.connector?.stroke]);

  const shapeFill = useMemo(() => {
    const shape = settings['shape:rect'];
    const match = palettes.find(({ value }) =>
      isEqual(value, shape?.fillColor)
    );
    return match ? JSON.stringify(match.value) : colorOptions[0]?.value;
  }, [colorOptions, palettes, settings]);

  return (
    <>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.page.edgeless-default-theme.title'
        ]()}
      >
        <SettingDropdownSelect
          options={themeOptions}
          value={settings.edgelessDefaultTheme}
          onChange={v =>
            editorSetting.set(
              'edgelessDefaultTheme',
              v as EditorSettingSchema['edgelessDefaultTheme']
            )
          }
        />
      </RowLayout>
      <RowLayout
        label={t[
          'com.affine.settings.editorSettings.page.edgeless-scroll-wheel-zoom.title'
        ]()}
      >
        <Switch
          checked={settings.edgelessScrollZoom}
          onChange={checked => editorSetting.set('edgelessScrollZoom', checked)}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.note']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={noteBg}
          onChange={setNoteBg}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.text']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={textColor}
          onChange={serialized => {
            try {
              editorSetting.set('affine:edgeless-text', {
                color: JSON.parse(serialized),
              });
            } catch {
              // ignore
            }
          }}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.shape']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={shapeFill}
          onChange={serialized => {
            try {
              editorSetting.set('shape:rect', {
                fillColor: JSON.parse(serialized),
              });
            } catch {
              // ignore
            }
          }}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.frame']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={frameBg}
          onChange={setFrameBg}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.connecter']()}
      >
        <SettingDropdownSelect
          options={colorOptions}
          value={connectorStroke}
          onChange={serialized => {
            try {
              editorSetting.set('connector', {
                stroke: JSON.parse(serialized),
              });
            } catch {
              // ignore
            }
          }}
        />
      </RowLayout>
      <RowLayout
        label={t['com.affine.settings.editorSettings.edgeless.mind-map']()}
      >
        <SettingDropdownSelect
          options={[
            { label: 'Style 1', value: '1' },
            { label: 'Style 2', value: '2' },
            { label: 'Style 3', value: '3' },
            { label: 'Style 4', value: '4' },
          ]}
          value={String(settings.mindmap?.style ?? 1)}
          onChange={v =>
            editorSetting.set('mindmap', {
              style: Number(v) as typeof settings.mindmap.style,
            })
          }
        />
      </RowLayout>
    </>
  );
};
