import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import type { GfxController } from '@blocksuite/std/gfx';
import { GfxControllerIdentifier } from '@blocksuite/std/gfx';
import { useEffect, useState } from 'react';

const MAX_GFX_POLL_FRAMES = 180;

function readGfx(
  editorContainer: AffineEditorContainer | null | undefined
): GfxController | null {
  if (!editorContainer?.host?.std) return null;
  try {
    return editorContainer.host.std.get(GfxControllerIdentifier);
  } catch {
    return null;
  }
}

/** Poll briefly after edgeless host mount — gfx is often ready 1–2 frames later. */
export function useEdgelessGfx(
  editorContainer: AffineEditorContainer | null | undefined
): GfxController | null {
  const [gfx, setGfx] = useState<GfxController | null>(() =>
    readGfx(editorContainer)
  );

  useEffect(() => {
    const immediate = readGfx(editorContainer);
    if (immediate) {
      setGfx(immediate);
      return;
    }
    setGfx(null);
    if (!editorContainer) return;

    let cancelled = false;
    let frames = 0;
    const poll = () => {
      if (cancelled) return;
      const next = readGfx(editorContainer);
      if (next) {
        setGfx(next);
        return;
      }
      frames += 1;
      if (frames >= MAX_GFX_POLL_FRAMES) return;
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
    return () => {
      cancelled = true;
    };
  }, [editorContainer]);

  return gfx;
}
