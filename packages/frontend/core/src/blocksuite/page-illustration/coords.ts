/**
 * Map a client pointer position to page-content coordinates
 * (origin = top-left of the page content box, includes scroll offset).
 */
export function clientToPageContentPoint(
  clientX: number,
  clientY: number,
  contentEl: HTMLElement
): [number, number] {
  const rect = contentEl.getBoundingClientRect();
  const x = clientX - rect.left + contentEl.scrollLeft;
  const y = clientY - rect.top + contentEl.scrollTop;
  return [x, y];
}

/** Hit-test a polyline in page content space (approx. stroke half-width). */
export function isNearPolyline(
  point: [number, number],
  absolutePoints: [number, number][],
  threshold: number
): boolean {
  if (absolutePoints.length === 0) return false;
  if (absolutePoints.length === 1) {
    const dx = point[0] - absolutePoints[0][0];
    const dy = point[1] - absolutePoints[0][1];
    return Math.hypot(dx, dy) <= threshold;
  }
  for (let i = 1; i < absolutePoints.length; i++) {
    if (
      distanceToSegment(point, absolutePoints[i - 1], absolutePoints[i]) <=
      threshold
    ) {
      return true;
    }
  }
  return false;
}

function distanceToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
