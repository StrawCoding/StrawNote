import { useI18n } from '@affine/i18n';

import {
  STRAWNOTE_COMMUNITY_URL,
  STRAWNOTE_HOME_URL,
  STRAWNOTE_PRIVACY_URL,
  STRAWNOTE_TERMS_URL,
} from '../../../../constants/strawnote-links';
import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';

export const OthersGroup = () => {
  const t = useI18n();

  return (
    <SettingGroup title={t['com.affine.mobile.setting.others.title']()}>
      <RowLayout
        label={t['com.affine.mobile.setting.others.discord']()}
        href={STRAWNOTE_COMMUNITY_URL}
      />
      <RowLayout
        label={t['com.affine.mobile.setting.others.github']()}
        href={STRAWNOTE_HOME_URL}
      />

      <RowLayout
        label={t['com.affine.mobile.setting.others.website']()}
        href={STRAWNOTE_HOME_URL}
      />

      <RowLayout
        label={t['com.affine.mobile.setting.others.privacy']()}
        href={STRAWNOTE_PRIVACY_URL}
      />

      <RowLayout
        label={t['com.affine.mobile.setting.others.terms']()}
        href={STRAWNOTE_TERMS_URL}
      />
    </SettingGroup>
  );
};
