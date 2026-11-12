import { I18n } from '@affine/i18n';

/** Temporary: StrawNote desktop builds are not ready; use official AFFiNE downloads. */
export const OFFICIAL_APP_DOWNLOAD_URL = 'https://affine.pro/download';

/**
 * Open the app download page after showing a short StrawNote-in-development tip.
 * Returns false if the user cancels.
 */
export function openAppDownloadPage(
  url: string = BUILD_CONFIG.downloadUrl || OFFICIAL_APP_DOWNLOAD_URL
): boolean {
  const tip =
    I18n.t('com.affine.download.strawnote-developing-tip') ||
    'StrawNote is under active development. You will be redirected to the official AFFiNE download page for now.';

  const proceed = window.confirm(tip);
  if (!proceed) {
    return false;
  }
  window.open(url, '_blank', 'noreferrer');
  return true;
}
