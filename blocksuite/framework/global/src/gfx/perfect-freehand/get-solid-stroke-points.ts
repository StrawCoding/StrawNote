import type { IVec, IVec3 } from '../model/index.js';
import { getStroke } from './get-stroke.js';

export type SolidStrokeOptions = {
  /** 0–1; higher = more stroke stabilization / smoothing lag */
  streamline?: number;
  smoothing?: number;
  thinning?: number;
};

export function getSolidStrokePoints(
  points: (IVec | IVec3)[],
  lineWidth: number,
  options?: SolidStrokeOptions
) {
  const streamline = clamp01(options?.streamline ?? 0.5);
  const smoothing = clamp01(options?.smoothing ?? 0.5);
  const thinning = options?.thinning ?? 0.6;
  return getStroke(points, {
    size: lineWidth,
    thinning,
    streamline,
    smoothing,
    easing: t => Math.sin((t * Math.PI) / 2),
    simulatePressure: points[0]?.length === 2,
  });
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
