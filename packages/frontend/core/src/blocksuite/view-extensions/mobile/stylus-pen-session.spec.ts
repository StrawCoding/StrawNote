import { describe, expect, test, vi } from 'vitest';

import { SPEN_BUTTON_CLICK_MS } from './stylus-pen';
import { SpenEraserSession } from './stylus-pen-session';

function createHarness(initialTool = 'brush') {
  let tool = initialTool;
  const onEnter = vi.fn();
  const onExit = vi.fn();
  const session = new SpenEraserSession({
    getCurrentTool: () => tool,
    isEraserTool: t => t === 'eraser',
    defaultRestoreTool: 'brush',
    onEnterEraser: meta => {
      onEnter(meta);
      tool = 'eraser';
    },
    onExitEraser: previous => {
      onExit(previous);
      tool =
        previous === 'brush' || previous === 'eraser' || previous === 'pan'
          ? previous
          : 'brush';
    },
  });
  return {
    session,
    onEnter,
    onExit,
    getTool: () => tool,
    setTool: (t: string) => {
      tool = t;
    },
  };
}

describe('SpenEraserSession', () => {
  test('toggle enters sticky eraser then restores', () => {
    const h = createHarness('brush');
    h.session.handleAction('toggle');
    expect(h.getTool()).toBe('eraser');
    expect(h.session.isForced).toBe(true);
    expect(h.session.isSticky).toBe(true);
    expect(h.onEnter).toHaveBeenCalledWith(
      expect.objectContaining({ sticky: true, previousTool: 'brush' })
    );

    h.session.handleAction('toggle');
    expect(h.getTool()).toBe('brush');
    expect(h.session.isForced).toBe(false);
    expect(h.onExit).toHaveBeenCalledWith('brush');
  });

  test('toggle restores when already on eraser tool', () => {
    const h = createHarness('eraser');
    h.session.handleAction('toggle');
    expect(h.getTool()).toBe('brush');
    expect(h.onExit).toHaveBeenCalled();
  });

  test('force-eraser is momentary; tip-up restores', () => {
    const h = createHarness('pan');
    h.session.handleAction('force-eraser');
    expect(h.getTool()).toBe('eraser');
    expect(h.session.isSticky).toBe(false);
    expect(h.session.previousTool).toBe('pan');

    h.session.onStylusTipUp();
    expect(h.getTool()).toBe('pan');
  });

  test('arm-hold schedules momentary eraser', async () => {
    vi.useFakeTimers();
    const h = createHarness('brush');
    h.session.handleAction('arm-hold');
    expect(h.getTool()).toBe('brush');
    vi.advanceTimersByTime(SPEN_BUTTON_CLICK_MS);
    expect(h.getTool()).toBe('eraser');
    expect(h.session.isSticky).toBe(false);
    vi.useRealTimers();
  });

  test('clear drops session when toolbar picks a tool', () => {
    const h = createHarness('brush');
    h.session.handleAction('toggle');
    h.session.clear();
    expect(h.session.isForced).toBe(false);
    expect(h.session.isSticky).toBe(false);
    h.setTool('brush');
    h.session.handleAction('toggle');
    expect(h.getTool()).toBe('eraser');
  });

  test('enterFromStylusTip clears sticky', () => {
    const h = createHarness('brush');
    h.session.handleAction('toggle');
    expect(h.session.isSticky).toBe(true);
    h.session.enterFromStylusTip();
    expect(h.session.isSticky).toBe(false);
    expect(h.getTool()).toBe('eraser');
  });
});
