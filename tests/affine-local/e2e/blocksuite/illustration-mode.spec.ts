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
