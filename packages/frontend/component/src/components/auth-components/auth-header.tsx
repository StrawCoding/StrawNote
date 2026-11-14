import clsx from 'clsx';
import type { FC } from 'react';

import { StrawNoteLogoIcon } from '../../ui/strawnote-logo-icon';
import { authHeaderWrapper } from './share.css';

export const AuthHeader: FC<{
  title: string;
  subTitle?: string;
  className?: string;
}> = ({ title, subTitle, className }) => {
  return (
    <div className={clsx(authHeaderWrapper, className)}>
      <p>
        <StrawNoteLogoIcon className="logo" width={28} height={28} />
        {title}
      </p>
      <p>{subTitle}</p>
    </div>
  );
};
