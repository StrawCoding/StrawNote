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

test('illustration brush locks touch-action so S Pen does not scroll', async ({
  page,
}) => {
  await clickIllustrationModeButton(page);
  await page.getByTestId('page-illustration-tool-brush').click();
  const svg = page.getByTestId('page-illustration-overlay').locator('svg');
  await expect(svg).toHaveCSS('touch-action', 'none');

  await page.getByTestId('page-illustration-tool-eraser').click();
  await expect(svg).toHaveCSS('touch-action', 'none');
});

test('illustration eraser accepts finger touch swipe', async ({ page }) => {
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

  // Finger swipe with eraser should erase (even when fingerPanOnly default)
  await page.getByTestId('page-illustration-tool-eraser').click();
  await expect(
    page.getByTestId('page-illustration-tool-eraser')
  ).toHaveAttribute('data-active', 'true');
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

  await expect
    .poll(async () => svg.locator('path').count(), { timeout: 5000 })
    .toBeLessThan(beforeCount);
});
