/** @vitest-environment happy-dom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type * as Infra from '@toeverything/infra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as checkModule from './check';
import type * as prefsModule from './prefs';

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn(),
  checkForStrawNoteAppUpdate: vi.fn(),
  shouldSuppressAppUpdatePrompt: vi.fn(() => false),
  snoozeAppUpdate: vi.fn(),
  ignoreAppUpdateVersion: vi.fn(),
}));

vi.mock('@affine/i18n', () => ({
  useI18n: () =>
    new Proxy(
      {},
      {
        get: () => (options?: Record<string, string>) => {
          if (options?.latest && options?.current) {
            return `${options.latest}/${options.current}`;
          }
          return 'text';
        },
      }
    ),
}));

vi.mock('@toeverything/infra', async importOriginal => {
  const actual = await importOriginal<typeof Infra>();
  return {
    ...actual,
    useService: () => ({ openExternal: mocks.openExternal }),
  };
});

vi.mock('./check', async importOriginal => {
  const actual = await importOriginal<typeof checkModule>();
  return {
    ...actual,
    checkForStrawNoteAppUpdate: mocks.checkForStrawNoteAppUpdate,
  };
});

vi.mock('./prefs', async importOriginal => {
  const actual = await importOriginal<typeof prefsModule>();
  return {
    ...actual,
    shouldSuppressAppUpdatePrompt: mocks.shouldSuppressAppUpdatePrompt,
    snoozeAppUpdate: mocks.snoozeAppUpdate,
    ignoreAppUpdateVersion: mocks.ignoreAppUpdateVersion,
  };
});

vi.mock('@affine/component', () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    'data-testid'?: string;
  }) => (
    <button type="button" onClick={onClick} data-testid={rest['data-testid']}>
      {children}
    </button>
  ),
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" data-testid="strawnote-app-update-prompt">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const updateResult = {
  hasUpdate: true,
  currentVersion: '0.28.0.11',
  latestVersion: '0.28.0.12',
  playUrl:
    'https://play.google.com/store/apps/details?id=com.strawcoding.strawnote',
  message: '',
  checkFailed: false,
};

describe('AppUpdatePrompt', () => {
  beforeEach(() => {
    mocks.openExternal.mockReset();
    mocks.checkForStrawNoteAppUpdate.mockReset();
    mocks.shouldSuppressAppUpdatePrompt.mockReset();
    mocks.shouldSuppressAppUpdatePrompt.mockReturnValue(false);
    mocks.snoozeAppUpdate.mockReset();
    mocks.ignoreAppUpdateVersion.mockReset();
    mocks.checkForStrawNoteAppUpdate.mockResolvedValue(updateResult);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows three actions and routes go/ignore/later', async () => {
    const { AppUpdatePrompt } = await import('./prompt');
    render(
      <AppUpdatePrompt enabled nativeVersion="0.28.0.11" checkDelayMs={0} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('strawnote-app-update-prompt')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('strawnote-app-update-go'));
    expect(mocks.openExternal).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.strawcoding.strawnote'
    );

    cleanup();
    render(
      <AppUpdatePrompt enabled nativeVersion="0.28.0.11" checkDelayMs={0} />
    );
    await waitFor(() =>
      expect(screen.getByTestId('strawnote-app-update-later')).toBeTruthy()
    );
    fireEvent.click(screen.getByTestId('strawnote-app-update-later'));
    expect(mocks.snoozeAppUpdate).toHaveBeenCalled();

    cleanup();
    render(
      <AppUpdatePrompt enabled nativeVersion="0.28.0.11" checkDelayMs={0} />
    );
    await waitFor(() =>
      expect(screen.getByTestId('strawnote-app-update-ignore')).toBeTruthy()
    );
    fireEvent.click(screen.getByTestId('strawnote-app-update-ignore'));
    expect(mocks.ignoreAppUpdateVersion).toHaveBeenCalledWith('0.28.0.12');
  });
});
