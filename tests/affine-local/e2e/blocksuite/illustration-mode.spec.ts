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
