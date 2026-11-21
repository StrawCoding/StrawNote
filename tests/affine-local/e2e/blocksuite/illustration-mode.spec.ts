import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickIllustrationModeButton,
  clickPageModeButton,
  ensureInIllustrationMode,
  getPageMode,
} from '@affine-test/kit/utils/editor';
import { openHomePage, setCoreUrl } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL) setCoreUrl(baseURL.replace(/\/$/, ''));
  await openHomePage(page);
  await clickNewPageButton(page, 'Illustration Mode');
  await waitForEditorLoad(page);
});

test('illustration mode mounts page editor with ink overlay', async ({
  page,
}) => {
  await expect(
    page.getByTestId('switch-illustration-mode-button')
  ).toBeVisible();

  await clickIllustrationModeButton(page);
  expect(await getPageMode(page)).toBe('illustration');
  await expect(page.getByTestId('page-illustration-overlay')).toBeVisible();
  await expect(page.locator('affine-page-root')).toBeVisible();
  await expect(page.locator('affine-edgeless-root')).toHaveCount(0);

  // Switching to edgeless still works (whiteboard separate from page ink).
  await clickEdgelessModeButton(page);
  expect(await getPageMode(page)).toBe('edgeless');
  await expect(page.locator('affine-edgeless-root')).toBeVisible();

  await clickPageModeButton(page);
  expect(await getPageMode(page)).toBe('page');

  // Alt+I jumps to illustration
  await page.keyboard.down('Alt');
  await page.keyboard.press('KeyI');
  await page.keyboard.up('Alt');
  await ensureInIllustrationMode(page);
  await expect(page.getByTestId('page-illustration-overlay')).toBeVisible();
});

test('illustration toolbar exposes pen tools and accepts pen strokes', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await expect(page.getByTestId('page-illustration-toolbar')).toBeVisible();
  await expect(page.getByTestId('page-illustration-tool-brush')).toBeVisible();
  await expect(page.getByTestId('page-illustration-tool-eraser')).toBeVisible();
  await expect(page.getByTestId('page-illustration-add-color')).toBeVisible();
  await expect(
    page.getByTestId('page-illustration-color-000000')
  ).toBeVisible();
  // Hex field appears only when adding a preset color
  await page.getByTestId('page-illustration-add-color').click();
  await expect(page.getByTestId('page-illustration-hex')).toBeVisible();

  await page.getByTestId('page-illustration-tool-brush').click();
  const overlay = page.getByTestId('page-illustration-overlay');
  const svg = overlay.locator('svg');
  const box = await svg.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;

  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.4;
  await svg.dispatchEvent('pointerdown', {
    pointerType: 'pen',
    pointerId: 1,
    clientX: startX,
    clientY: startY,
    pressure: 0.6,
    buttons: 1,
    bubbles: true,
  });
  await svg.dispatchEvent('pointermove', {
    pointerType: 'pen',
    pointerId: 1,
    clientX: startX + 40,
    clientY: startY + 20,
    pressure: 0.6,
    buttons: 1,
    bubbles: true,
  });
  await svg.dispatchEvent('pointerup', {
    pointerType: 'pen',
    pointerId: 1,
    clientX: startX + 40,
    clientY: startY + 20,
    pressure: 0,
    buttons: 0,
    bubbles: true,
  });

  // Live or committed path should appear in the overlay SVG
  await expect(svg.locator('path')).not.toHaveCount(0, { timeout: 5000 });

  // S Pen short click toggles eraser tool
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'down', pressed: true },
      })
    );
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'up', pressed: false },
      })
    );
  });
  await expect(
    page.getByTestId('page-illustration-tool-eraser')
  ).toHaveAttribute('data-active', 'true');
});

test('illustration S Pen barrel on web toggles eraser via pointer bridge', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  // Text editing is the default; choose the pen before testing its side button.
  await expect(page.getByTestId('page-illustration-tool-pan')).toHaveAttribute(
    'data-active',
    'true'
  );
  await page.getByTestId('page-illustration-tool-brush').click();
  await expect(
    page.getByTestId('page-illustration-tool-brush')
  ).toHaveAttribute('data-active', 'true');

  // Both Android-style stylus bits and Chromium's standard secondary bit.
  for (const buttons of [32, 2]) {
    await page.getByTestId('page-illustration-tool-brush').click();
    await page.evaluate(buttons => {
      for (const state of [buttons, 0]) {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'pen',
            pointerId: 9,
            button: -1,
            buttons: state,
            bubbles: true,
            cancelable: true,
            composed: true,
          })
        );
      }
    }, buttons);
    await expect(
      page.getByTestId('page-illustration-tool-eraser')
    ).toHaveAttribute('data-active', 'true');
  }
});

test('held S Pen button keeps erasing through pen contact and tip-up', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.getByTestId('page-illustration-tool-brush').click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'down', pressed: true },
      })
    )
  );
  const eraser = page.getByTestId('page-illustration-tool-eraser');
  await expect(eraser).toHaveAttribute('data-active', 'true');
  const svg = page.getByTestId('page-illustration-overlay').locator('svg');
  const box = await svg.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const pointer = {
    pointerType: 'pen',
    pointerId: 19,
    buttons: 1,
    button: 0,
    clientX: box.x + 60,
    clientY: box.y + 100,
    pressure: 0.5,
    bubbles: true,
  };
  await svg.dispatchEvent('pointerdown', pointer);
  await expect(eraser).toHaveAttribute('data-active', 'true');
  await svg.dispatchEvent('pointermove', {
    ...pointer,
    clientY: pointer.clientY + 30,
  });
  await svg.dispatchEvent('pointerup', { ...pointer, buttons: 0 });
  await expect(eraser).toHaveAttribute('data-active', 'true');
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'up', pressed: false },
      })
    )
  );
  await expect(
    page.getByTestId('page-illustration-tool-brush')
  ).toHaveAttribute('data-active', 'true');
});

test('short side-button click during tip contact toggles only once', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.getByTestId('page-illustration-tool-brush').click();
  const svg = page.getByTestId('page-illustration-overlay').locator('svg');
  await svg.evaluate(el => {
    const r = el.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'down', pressed: true },
      })
    );
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 20,
        button: 2,
        buttons: 3,
        clientX: r.x + 60,
        clientY: r.y + 100,
        pressure: 0.5,
        bubbles: true,
        cancelable: true,
      })
    );
    window.dispatchEvent(
      new CustomEvent('strawnote:spen-button', {
        detail: { action: 'up', pressed: false },
      })
    );
  });
  await expect(
    page.getByTestId('page-illustration-tool-eraser')
  ).toHaveAttribute('data-active', 'true');
  await svg.dispatchEvent('pointerup', {
    pointerType: 'pen',
    pointerId: 20,
    button: 0,
    buttons: 0,
    bubbles: true,
  });
  await expect(
    page.getByTestId('page-illustration-tool-eraser')
  ).toHaveAttribute('data-active', 'true');
});

test('illustration toolbar is fixed to the viewport, not page bottom', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  const toolbar = page.getByTestId('page-illustration-toolbar');
  await expect(toolbar).toBeVisible();

  const before = await toolbar.evaluate(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      position: cs.position,
      bottom: rect.bottom,
      parentIsBody: el.parentElement === document.body,
    };
  });
  expect(before.position).toBe('fixed');
  expect(before.parentIsBody).toBe(true);
  expect(before.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);

  // Grow the page so document bottom moves far below the viewport.
  await page.locator('affine-page-root').evaluate(root => {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('p');
      p.textContent = `spacer line ${i}`;
      p.style.minHeight = '48px';
      root.append(p);
    }
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);

  const after = await toolbar.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  const vh = page.viewportSize()!.height;
  expect(after.bottom).toBeLessThanOrEqual(vh);
  expect(after.top).toBeGreaterThan(vh * 0.5);
});

test('illustration ink tools block native pan before contact and during strokes', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.getByTestId('page-illustration-tool-brush').click();
  const svg = page.getByTestId('page-illustration-overlay').locator('svg');
  // Native panning must be off before contact; fingers use the overlay scroll handler.
  await expect(svg).toHaveCSS('touch-action', 'none');

  await page.getByTestId('page-illustration-tool-eraser').click();
  await expect(svg).toHaveCSS('touch-action', 'none');

  await page.getByTestId('page-illustration-tool-brush').click();
  const box = await svg.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await svg.dispatchEvent('pointerdown', {
    pointerType: 'pen',
    pointerId: 7,
    clientX: box.x + 20,
    clientY: box.y + 20,
    pressure: 0.5,
    buttons: 1,
    button: 0,
    bubbles: true,
  });
  await expect(svg).toHaveCSS('touch-action', 'none');
  await svg.dispatchEvent('pointerup', {
    pointerType: 'pen',
    pointerId: 7,
    clientX: box.x + 20,
    clientY: box.y + 20,
    pressure: 0,
    buttons: 0,
    button: 0,
    bubbles: true,
  });
  await expect(svg).toHaveCSS('touch-action', 'none');
});

test('illustration toolbar swaps pen width and eraser range options', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.getByTestId('page-illustration-tool-brush').click();

  const sizeOptions = page.getByTestId('page-illustration-size-options');
  await expect(sizeOptions).toHaveAttribute('data-tool', 'brush');
  await expect(page.getByTestId('page-illustration-width-4')).toBeVisible();
  await page.getByTestId('page-illustration-width-8').click();
  await expect(page.getByTestId('page-illustration-width-8')).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await page.getByTestId('page-illustration-tool-eraser').click();
  await expect(sizeOptions).toHaveAttribute('data-tool', 'eraser');
  await expect(
    page.getByTestId('page-illustration-eraser-size-32')
  ).toBeVisible();
  await page.getByTestId('page-illustration-eraser-size-64').click();
  await expect(
    page.getByTestId('page-illustration-eraser-size-64')
  ).toHaveAttribute('aria-pressed', 'true');

  // Switching back keeps brush width independent of eraser range.
  await page.getByTestId('page-illustration-tool-brush').click();
  await expect(sizeOptions).toHaveAttribute('data-tool', 'brush');
  await expect(page.getByTestId('page-illustration-width-8')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(
    page.getByTestId('page-illustration-eraser-size-64')
  ).toHaveCount(0);
});

test('illustration mode page can scroll under brush and eraser overlay', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);

  await page.locator('affine-page-root').evaluate(root => {
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('p');
      p.textContent = `scroll spacer ${i}`;
      p.style.minHeight = '64px';
      root.append(p);
    }
  });

  const viewport = page.locator('.affine-page-viewport').first();
  for (const tool of ['brush', 'eraser'] as const) {
    await page.getByTestId(`page-illustration-tool-${tool}`).click();
    const before = await viewport.evaluate(el => el.scrollTop);
    await viewport.evaluate(el => {
      el.scrollTop = 400;
    });
    const after = await viewport.evaluate(el => el.scrollTop);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeGreaterThanOrEqual(300);
    await viewport.evaluate(el => {
      el.scrollTop = 0;
    });
  }
});

test('vertical pen strokes stay ink while real finger drags scroll', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.locator('affine-page-root').evaluate(root => {
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('p');
      p.textContent = `gesture scroll spacer ${i}`;
      p.style.minHeight = '64px';
      root.append(p);
    }
  });
  await page.getByTestId('page-illustration-tool-brush').click();
  const viewport = page.locator('.affine-page-viewport').first();
  const svg = page.getByTestId('page-illustration-overlay').locator('svg');
  await expect(svg).toHaveCSS('touch-action', 'none');
  const box = await viewport.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + 300;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    pointerType: 'pen',
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    pointerType: 'pen',
    force: 0.5,
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y: y - i * 15,
      button: 'left',
      buttons: 1,
      pointerType: 'pen',
      force: 0.5,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y: y - 120,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    pointerType: 'pen',
  });
  await expect(svg.locator('path')).not.toHaveCount(0);
  expect(await viewport.evaluate(el => el.scrollTop)).toBe(0);
  const count = await svg.locator('path').count();
  // Use Chromium's actual touch input path, not a synthetic pointer event.
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - i * 15 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  expect(await viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(50);
  await expect(svg.locator('path')).toHaveCount(count);
});

test('illustration eraser uses pen stroke; finger stays scroll-only by default', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  const overlay = page.getByTestId('page-illustration-overlay');
  const svg = overlay.locator('svg');
  const box = await svg.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;

  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.35;

  const firePointer = async (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    pointerType: 'pen' | 'touch' | 'mouse',
    pointerId: number,
    x: number,
    y: number,
    buttons: number
  ) => {
    await svg.evaluate(
      (el, args) => {
        el.dispatchEvent(
          new PointerEvent(args.type, {
            pointerType: args.pointerType,
            pointerId: args.pointerId,
            clientX: args.x,
            clientY: args.y,
            pressure: args.buttons ? 0.6 : 0,
            buttons: args.buttons,
            button: 0,
            bubbles: true,
            cancelable: true,
            composed: true,
            isPrimary: true,
          })
        );
      },
      { type, pointerType, pointerId, x, y, buttons }
    );
  };

  // Draw a stroke with pen first
  await page.getByTestId('page-illustration-tool-brush').click();
  await expect(
    page.getByTestId('page-illustration-tool-brush')
  ).toHaveAttribute('data-active', 'true');
  await firePointer('pointerdown', 'pen', 1, startX, startY, 1);
  await firePointer('pointermove', 'pen', 1, startX + 80, startY, 1);
  await firePointer('pointerup', 'pen', 1, startX + 80, startY, 0);
  await expect(svg.locator('path')).not.toHaveCount(0, { timeout: 5000 });
  const beforeCount = await svg.locator('path').count();
  expect(beforeCount).toBeGreaterThan(0);

  // fingerPanOnly default: finger swipe must not erase (page scroll).
  await page.getByTestId('page-illustration-tool-eraser').click();
  await expect(
    page.getByTestId('page-illustration-tool-eraser')
  ).toHaveAttribute('data-active', 'true');
  await expect(svg).toHaveCSS('touch-action', 'none');
  await firePointer('pointerdown', 'touch', 2, startX + 10, startY, 1);
  for (let i = 1; i <= 10; i++) {
    await firePointer(
      'pointermove',
      'touch',
      2,
      startX + 10 + i * 8,
      startY,
      1
    );
  }
  await firePointer('pointerup', 'touch', 2, startX + 90, startY, 0);
  expect(await svg.locator('path').count()).toBe(beforeCount);

  // Pen eraser still removes ink.
  await firePointer('pointerdown', 'pen', 3, startX + 10, startY, 1);
  for (let i = 1; i <= 10; i++) {
    await firePointer('pointermove', 'pen', 3, startX + 10 + i * 8, startY, 1);
  }
  await firePointer('pointerup', 'pen', 3, startX + 90, startY, 0);

  await expect
    .poll(async () => svg.locator('path').count(), { timeout: 5000 })
    .toBeLessThan(beforeCount);
});
