import { Button, Modal } from '@affine/component';
import { UrlService } from '@affine/core/modules/url';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import {
  type AppUpdateCheckResult,
  checkForStrawNoteAppUpdate,
  resolveCurrentAppVersion,
} from './check';
import {
  ignoreAppUpdateVersion,
  shouldSuppressAppUpdatePrompt,
  snoozeAppUpdate,
} from './prefs';
import * as styles from './styles.css';

export type AppUpdatePromptProps = {
  /** Native package version from Capacitor App.getInfo(), when available. */
  nativeVersion?: string;
  /** Override Android detection (tests). */
  enabled?: boolean;
  /** Delay before first check (ms). */
  checkDelayMs?: number;
};

export const AppUpdatePrompt = ({
  nativeVersion,
  enabled,
  checkDelayMs = 1800,
}: AppUpdatePromptProps = {}) => {
  const t = useI18n();
  const urlService = useService(UrlService);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<AppUpdateCheckResult | null>(null);
  const isEnabled = enabled ?? BUILD_CONFIG.isAndroid;

  useEffect(() => {
    if (!isEnabled) return;

    let cancelled = false;

    const run = async () => {
      const currentVersion = resolveCurrentAppVersion(
        BUILD_CONFIG.appVersion,
        nativeVersion
      );
      const result = await checkForStrawNoteAppUpdate({ currentVersion });
      if (cancelled) return;
      if (!result.hasUpdate || !result.latestVersion) return;
      if (shouldSuppressAppUpdatePrompt(result.latestVersion)) return;
      setInfo(result);
      setOpen(true);
    };

    const timer = window.setTimeout(() => {
      run().catch(error => {
        console.error('[strawnote-app-update] check failed', error);
      });
    }, checkDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkDelayMs, isEnabled, nativeVersion]);

  const close = useCallback(() => setOpen(false), []);

  const onRemindLater = useCallback(() => {
    snoozeAppUpdate();
    close();
  }, [close]);

  const onIgnore = useCallback(() => {
    if (info?.latestVersion) {
      ignoreAppUpdateVersion(info.latestVersion);
    }
    close();
  }, [close, info]);

  const onGoUpdate = useCallback(() => {
    const url = info?.playUrl;
    if (url) {
      urlService.openExternal(url);
    }
    close();
  }, [close, info, urlService]);

  if (!info) return null;

  const description =
    info.message ||
    t['com.affine.strawnote.app-update.message']({
      latest: info.latestVersion,
      current: info.currentVersion,
    });

  return (
    <Modal
      open={open}
      onOpenChange={next => {
        if (!next) onRemindLater();
      }}
      title={t['com.affine.strawnote.app-update.title']()}
      description={description}
      withoutCloseButton
      persistent
      width={360}
      data-testid="strawnote-app-update-prompt"
    >
      <p className={styles.versionLine}>
        {t['com.affine.strawnote.app-update.version-line']({
          latest: info.latestVersion,
          current: info.currentVersion,
        })}
      </p>
      <div className={styles.footer}>
        <Button
          className={styles.primaryBtn}
          variant="primary"
          data-testid="strawnote-app-update-go"
          onClick={onGoUpdate}
        >
          {t['com.affine.strawnote.app-update.go']()}
        </Button>
        <div className={styles.secondaryRow}>
          <Button
            className={styles.secondaryBtn}
            variant="secondary"
            data-testid="strawnote-app-update-later"
            onClick={onRemindLater}
          >
            {t['com.affine.strawnote.app-update.later']()}
          </Button>
          <Button
            className={styles.secondaryBtn}
            variant="secondary"
            data-testid="strawnote-app-update-ignore"
            onClick={onIgnore}
          >
            {t['com.affine.strawnote.app-update.ignore']()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
