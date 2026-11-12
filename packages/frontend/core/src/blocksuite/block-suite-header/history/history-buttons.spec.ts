import { describe, expect, test } from 'vitest';

import { isHistoryActionEnabled } from './history-buttons';

describe('isHistoryActionEnabled', () => {
  test('enabled only when editable and history allows', () => {
    expect(isHistoryActionEnabled(false, true)).toBe(true);
    expect(isHistoryActionEnabled(false, false)).toBe(false);
    expect(isHistoryActionEnabled(true, true)).toBe(false);
    expect(isHistoryActionEnabled(true, false)).toBe(false);
  });
});
