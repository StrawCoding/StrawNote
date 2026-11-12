import { Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useAppUpdater } from '@affine/core/components/hooks/use-app-updater';
import { UrlService } from '@affine/core/modules/url';
import { appIconMap, appNames } from '@affine/core/utils/channel';
import { useI18n } from '@affine/i18n';
import { ArrowRightSmallIcon, OpenInNewIcon } from '@blocksuite/icons/rc';
import { useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import { useAppSettingHelper } from '../../../../../components/hooks/affine/use-app-setting-helper';
import {
  STRAWNOTE_COMMUNITY_URL,
  STRAWNOTE_HOME_URL,
  STRAWNOTE_PRIVACY_URL,
  STRAWNOTE_TERMS_URL,
} from '../../../../../constants/strawnote-links';
import { relatedLinks } from './config';
import * as styles from './style.css';
import { UpdateCheckSection } from './update-check-section';

export const AboutAffine = () => {
  const t = useI18n();
  const { appSettings, updateSettings } = useAppSettingHelper();
  const { toggleAutoCheck, toggleAutoDownload } = useAppUpdater();
  const channel = BUILD_CONFIG.appBuildType;
  const appIcon = appIconMap[channel];
  const appName = appNames[channel];
  const { urlService } = useServices({
    UrlService,
  });

  const onSwitchAutoCheck = useCallback(
    (checked: boolean) => {
      toggleAutoCheck(checked);
      updateSettings('autoCheckUpdate', checked);
    },
    [toggleAutoCheck, updateSettings]
  );

  const onSwitchAutoDownload = useCallback(
    (checked: boolean) => {
      toggleAutoDownload(checked);
      updateSettings('autoDownloadUpdate', checked);
    },
    [toggleAutoDownload, updateSettings]
  );

  const onSwitchTelemetry = useCallback(
    (checked: boolean) => {
      updateSettings('enableTelemetry', checked);
    },
    [updateSettings]
  );

  return (
    <>
      <SettingHeader
        title={t['com.affine.aboutStrawNote.title']()}
        subtitle={t['com.affine.aboutStrawNote.subtitle']()}
        data-testid="about-title"
      />
      <SettingWrapper title={t['com.affine.aboutStrawNote.version.title']()}>
        <SettingRow
          name={appName}
          desc={BUILD_CONFIG.appVersion}
          className={styles.appImageRow}
        >
          <img src={appIcon} alt={appName} width={56} height={56} />
        </SettingRow>
        <SettingRow
          name={t['com.affine.aboutStrawNote.version.editor.title']()}
          desc={BUILD_CONFIG.editorVersion}
        />
        {BUILD_CONFIG.isElectron ? (
          <>
            <UpdateCheckSection />
            <SettingRow
              name={t['com.affine.aboutStrawNote.autoCheckUpdate.title']()}
              desc={t[
                'com.affine.aboutStrawNote.autoCheckUpdate.description'
              ]()}
            >
              <Switch
                checked={appSettings.autoCheckUpdate}
                onChange={onSwitchAutoCheck}
              />
            </SettingRow>
            <SettingRow
              name={t['com.affine.aboutStrawNote.autoDownloadUpdate.title']()}
              desc={t[
                'com.affine.aboutStrawNote.autoDownloadUpdate.description'
              ]()}
            >
              <Switch
                checked={appSettings.autoDownloadUpdate}
                onChange={onSwitchAutoDownload}
              />
            </SettingRow>
            <SettingRow
              name={t['com.affine.aboutStrawNote.changelog.title']()}
              desc={t['com.affine.aboutStrawNote.changelog.description']()}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                urlService.openPopupWindow(BUILD_CONFIG.changelogUrl);
              }}
            >
              <ArrowRightSmallIcon />
            </SettingRow>
          </>
        ) : null}
        <SettingRow
          name={t['com.affine.telemetry.enable']()}
          desc={t['com.affine.telemetry.enable.desc']()}
        >
          <Switch
            checked={appSettings.enableTelemetry !== false}
            onChange={onSwitchTelemetry}
          />
        </SettingRow>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutStrawNote.contact.title']()}>
        <a
          className={styles.link}
          rel="noreferrer"
          href={STRAWNOTE_HOME_URL}
          target="_blank"
        >
          {t['com.affine.aboutStrawNote.contact.website']()}
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href={STRAWNOTE_COMMUNITY_URL}
          target="_blank"
        >
          {t['com.affine.aboutStrawNote.contact.community']()}
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutStrawNote.community.title']()}>
        <div className={styles.communityWrapper}>
          {relatedLinks.map(({ icon, title, link }) => {
            return (
              <div
                className={styles.communityItem}
                onClick={() => {
                  urlService.openPopupWindow(link);
                }}
                key={title}
              >
                {icon}
                <p>{title}</p>
              </div>
            );
          })}
        </div>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutStrawNote.legal.title']()}>
        <a
          className={styles.link}
          rel="noreferrer"
          href={STRAWNOTE_PRIVACY_URL}
          target="_blank"
        >
          {t['com.affine.aboutStrawNote.legal.privacy']()}
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href={STRAWNOTE_TERMS_URL}
          target="_blank"
        >
          {t['com.affine.aboutStrawNote.legal.tos']()}
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
    </>
  );
};
