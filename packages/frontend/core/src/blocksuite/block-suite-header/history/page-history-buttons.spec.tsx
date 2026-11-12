/**
 * @vitest-environment happy-dom
 */
import { signal } from '@preact/signals-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@affine/i18n', () => ({
  useI18n: () =>
    new Proxy(
      {},
      {
        get: () => () => 'label',
      }
    ),
}));

vi.mock('@affine/track', () => ({
  track: {
    $: {
      header: {
        actions: {
          undo: vi.fn(),
          redo: vi.fn(),
        },
      },
    },
  },
}));

vi.mock('@affine/component', () => ({
  IconButton: ({
    children,
    onClick,
    disabled,
    'data-testid': testId,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'data-testid'?: string;
    'aria-label'?: string;
  }) => (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

vi.mock('@blocksuite/icons/rc', () => ({
  UndoIcon: () => <span>undo</span>,
  RedoIcon: () => <span>redo</span>,
}));

import { PageHistoryButtons } from './index';

function createMockPage(opts: {
  readonly?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const canUndo$ = signal(!!opts.canUndo);
  const canRedo$ = signal(!!opts.canRedo);
  return {
    readonly: !!opts.readonly,
    history: { canUndo$, canRedo$ },
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

describe('PageHistoryButtons', () => {
  afterEach(() => {
    cleanup();
  });

  test('disables both when history empty', () => {
    const page = createMockPage({});
    render(<PageHistoryButtons page={page as never} />);
    expect(
      (screen.getByTestId('header-undo-button') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByTestId('header-redo-button') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  test('undo/redo call store history for note edits', () => {
    const page = createMockPage({ canUndo: true, canRedo: true });
    render(<PageHistoryButtons page={page as never} />);

    fireEvent.click(screen.getByTestId('header-undo-button'));
    fireEvent.click(screen.getByTestId('header-redo-button'));

    expect(page.undo).toHaveBeenCalledTimes(1);
    expect(page.redo).toHaveBeenCalledTimes(1);
  });

  test('readonly disables actions even if history has stacks', () => {
    const page = createMockPage({
      readonly: true,
      canUndo: true,
      canRedo: true,
    });
    render(<PageHistoryButtons page={page as never} />);
    expect(
      (screen.getByTestId('header-undo-button') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByTestId('header-redo-button') as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
