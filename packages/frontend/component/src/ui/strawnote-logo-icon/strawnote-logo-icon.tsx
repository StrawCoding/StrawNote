import clsx from 'clsx';
import type { ImgHTMLAttributes } from 'react';

/**
 * StrawNote brand mark for chrome (auth header, nav, settings).
 * Replaces upstream AFFiNE Logo1Icon so load/sign-in never flash AFFiNE.
 */
export function StrawNoteLogoIcon({
  className,
  width = 24,
  height = 24,
  style,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/StrawNoteIcon.png"
      alt=""
      aria-hidden
      draggable={false}
      className={clsx(className)}
      width={width}
      height={height}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 4,
        objectFit: 'cover',
        ...style,
      }}
      {...rest}
    />
  );
}
