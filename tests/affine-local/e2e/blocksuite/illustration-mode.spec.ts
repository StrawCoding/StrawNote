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

test('illustration mode switch shows canvas editor and shares surface with edgeless', async ({
  page,
}) => {
  await expect(
    page.getByTestId('switch-illustration-mode-button')
  ).toBeVisible();

  await clickIllustrationModeButton(page);
  expect(await getPageMode(page)).toBe('illustration');
  await expect(page.locator('[data-illustration-mode="true"]')).toBeVisible();
  await expect(page.locator('affine-edgeless-root')).toBeVisible();

  // Strokes live on the shared surface — switching to edgeless keeps canvas.
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
});
