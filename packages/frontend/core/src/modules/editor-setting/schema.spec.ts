import { describe, expect, test } from 'vitest';

import { EditorSettingSchema } from './schema';

describe('stylus preference compatibility', () => {
  test('new settings default to unlocked text and disabled palm rejection', () => {
    expect(EditorSettingSchema.shape.stylus.parse(undefined)).toEqual({
      fingerPanOnly: true,
      palmRejection: false,
      illustrationTextLock: false,
      buttonMode: 'both',
    });
  });

  test('older saved settings gain new defaults without losing user choices', () => {
    expect(
      EditorSettingSchema.shape.stylus.parse({
        fingerPanOnly: false,
        buttonMode: 'hold',
      })
    ).toEqual({
      fingerPanOnly: false,
      buttonMode: 'hold',
      palmRejection: false,
      illustrationTextLock: false,
    });
  });

  test('explicit opt-in values survive parsing saved settings', () => {
    const saved = { palmRejection: true, illustrationTextLock: true };
    expect(
      EditorSettingSchema.shape.stylus.parse(JSON.parse(JSON.stringify(saved)))
    ).toMatchObject(saved);
  });
});
