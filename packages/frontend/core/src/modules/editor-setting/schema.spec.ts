import { describe, expect, test } from 'vitest';

import { EditorSettingSchema } from './schema';

describe('stylus preference compatibility', () => {
  test('eraser size has its own default and validates saved ranges', () => {
    expect(EditorSettingSchema.shape.eraser.parse(undefined)).toEqual({
      size: 32,
    });
    expect(EditorSettingSchema.shape.eraser.parse({ size: 64 })).toEqual({
      size: 64,
    });
    expect(
      EditorSettingSchema.shape.eraser.safeParse({ size: 0 }).success
    ).toBe(false);
    expect(
      EditorSettingSchema.shape.eraser.safeParse({ size: 200 }).success
    ).toBe(false);
  });
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
