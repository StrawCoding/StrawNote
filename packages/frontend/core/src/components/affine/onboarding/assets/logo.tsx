import { memo } from 'react';

/** StrawNote app mark (replaces upstream AFFiNE onboarding SVG). */
export default memo(function Logo() {
  return (
    <img
      src="/StrawNoteIcon.png"
      alt=""
      width={120}
      height={120}
      draggable={false}
      style={{ borderRadius: 24, objectFit: 'cover', display: 'block' }}
    />
  );
});
