import { expect, test } from 'vitest';

import { toProtocolClientVersion } from '../protocol-client-version';

test('keeps three-part semver', () => {
  expect(toProtocolClientVersion('0.28.0')).toBe('0.28.0');
  expect(toProtocolClientVersion('v0.27.4')).toBe('0.27.4');
});

test('drops StrawNote preview digit for protocol', () => {
  expect(toProtocolClientVersion('0.28.0.9')).toBe('0.28.0');
  expect(toProtocolClientVersion('0.28.0.10')).toBe('0.28.0');
  expect(toProtocolClientVersion('v0.28.0.10')).toBe('0.28.0');
});
