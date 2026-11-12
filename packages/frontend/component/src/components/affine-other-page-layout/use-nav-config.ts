import { useI18n } from '@affine/i18n';
import { useMemo } from 'react';

export const useNavConfig = () => {
  const t = useI18n();
  return useMemo(
    () => [
      {
        title: t['com.affine.other-page.nav.official-website'](),
        path: 'https://github.com/StrawCoding/StrawNote',
      },
      {
        title: t['com.affine.other-page.nav.blog'](),
        path: 'https://github.com/StrawCoding/StrawNote/releases',
      },
      {
        title: t['com.affine.other-page.nav.contact-us'](),
        path: 'https://github.com/StrawCoding/StrawNote',
      },
    ],
    [t]
  );
};
