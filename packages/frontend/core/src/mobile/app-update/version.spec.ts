import { describe, expect, it } from 'vitest';

import {
  compareStrawNoteVersions,
  isNewerStrawNoteVersion,
  parseStrawNoteVersion,
} from './version';

describe('parseStrawNoteVersion', () => {
  it('parses a.b.c.d', () => {
    expect(parseStrawNoteVersion('0.28.0.11')).toEqual([0, 28, 0, 11]);
    expect(parseStrawNoteVersion('v0.28.0.11')).toEqual([0, 28, 0, 11]);
  });

  it('pads shorter versions', () => {
    expect(parseStrawNoteVersion('0.28.0')).toEqual([0, 28, 0, 0]);
    expect(parseStrawNoteVersion('1.2')).toEqual([1, 2, 0, 0]);
  });
});

describe('compareStrawNoteVersions', () => {
  it('orders preview digits', () => {
    expect(compareStrawNoteVersions('0.28.0.10', '0.28.0.11')).toBeLessThan(0);
    expect(compareStrawNoteVersions('0.28.0.11', '0.28.0.10')).toBeGreaterThan(
      0
    );
    expect(compareStrawNoteVersions('0.28.0.11', '0.28.0.11')).toBe(0);
  });

  it('orders major/minor/patch before preview', () => {
    expect(isNewerStrawNoteVersion('0.28.0.99', '0.28.1.0')).toBe(true);
    expect(isNewerStrawNoteVersion('0.28.1.0', '0.28.0.99')).toBe(false);
  });
});
