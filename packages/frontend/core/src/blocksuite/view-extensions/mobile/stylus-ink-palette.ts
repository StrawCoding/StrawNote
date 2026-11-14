/** Normalize #RGB / #RRGGBB (shared ink chrome). */
export function parseStylusHexColor(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

/** Shared quick swatches for illustration (+ future ink chrome). */
export const STYLUS_QUICK_COLORS = [
  '#000000',
  '#ffffff',
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#7c3aed',
  '#ea580c',
] as const;

export const STYLUS_LINE_WIDTHS = [2, 4, 6, 8, 10, 12] as const;

const CUSTOM_COLORS_KEY = 'strawnote.stylus.customColors';
/** Legacy illustration-only key — migrated on first read. */
const LEGACY_ILLUSTRATION_COLORS_KEY = 'strawnote.illustration.customColors';

export function loadStylusCustomColors(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw =
      localStorage.getItem(CUSTOM_COLORS_KEY) ??
      localStorage.getItem(LEGACY_ILLUSTRATION_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const colors = parsed
      .filter((c): c is string => typeof c === 'string')
      .map(c => parseStylusHexColor(c))
      .filter((c): c is string => !!c)
      .slice(0, 16);
    // Migrate legacy key once.
    if (
      !localStorage.getItem(CUSTOM_COLORS_KEY) &&
      localStorage.getItem(LEGACY_ILLUSTRATION_COLORS_KEY)
    ) {
      saveStylusCustomColors(colors);
    }
    return colors;
  } catch {
    return [];
  }
}

export function saveStylusCustomColors(colors: string[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      CUSTOM_COLORS_KEY,
      JSON.stringify(colors.slice(0, 16))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function mergeStylusPalette(customColors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...STYLUS_QUICK_COLORS, ...customColors]) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
