import { I18n } from '@affine/i18n';
import { useEffect } from 'react';

import type { ConfirmModalProps } from '../ui/modal/confirm-modal';
import { useConfirmModal } from '../ui/modal/confirm-modal';

/** Temporary: StrawNote desktop builds are not ready; use interim download page. */
export const OFFICIAL_APP_DOWNLOAD_URL = 'https://affine.pro/download';

type OpenConfirmModal = (
  props?: ConfirmModalProps,
  options?: { autoClose?: boolean; onSuccess?: () => void }
) => void;

let openConfirmModalImpl: OpenConfirmModal | null = null;

export function registerAppDownloadConfirmModal(
  opener: OpenConfirmModal | null
) {
  openConfirmModalImpl = opener;
}

/**
 * Mount inside ConfirmModalProvider so download tips use the UI modal.
 */
export function AppDownloadConfirmBridge() {
  const { openConfirmModal } = useConfirmModal();
  useEffect(() => {
    registerAppDownloadConfirmModal(openConfirmModal);
    return () => registerAppDownloadConfirmModal(null);
  }, [openConfirmModal]);
  return null;
}

/**
 * Open the app download page after showing a StrawNote-in-development UI dialog.
 */
export function openAppDownloadPage(
  url: string = BUILD_CONFIG.downloadUrl || OFFICIAL_APP_DOWNLOAD_URL
): void {
  const title =
    I18n.t('com.affine.download.strawnote-developing-title') ||
    'StrawNote is under active development';
  const description =
    I18n.t('com.affine.download.strawnote-developing-tip') ||
    'StrawNote is under active development. You will be redirected to a temporary download page for now.';
  const confirmText =
    I18n.t('com.affine.download.strawnote-developing-confirm') ||
    'Go to download';
  const cancelText = I18n.t('Cancel') || 'Cancel';

  const openOfficial = () => {
    window.open(url, '_blank', 'noreferrer');
  };

  if (openConfirmModalImpl) {
    openConfirmModalImpl({
      title,
      description,
      confirmText,
      cancelText,
      confirmButtonOptions: {
        variant: 'primary',
      },
      onConfirm: openOfficial,
    });
    return;
  }

  // Fallback when ConfirmModalProvider is unavailable (e.g. early boot).
  openOfficial();
}
