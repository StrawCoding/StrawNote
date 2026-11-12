import { test } from '@affine-test/kit/playwright';
import { openHomePage, setCoreUrl } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  type,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  // Host :8080 may be occupied; local override configs set baseURL to :18080.
  if (baseURL) setCoreUrl(baseURL.replace(/\/$/, ''));
  await openHomePage(page);
  await clickNewPageButton(page, 'History Buttons');
  await waitForEditorLoad(page);
});

test('header undo/redo buttons reverse and restore note text edits', async ({
  page,
}) => {
  const undo = page.getByTestId('header-undo-button');
  const redo = page.getByTestId('header-redo-button');
  const marker = 'hello strawnote';

  await expect(undo).toBeVisible();
  await expect(redo).toBeVisible();

  await page.locator('affine-note').first().click();
  await page.keyboard.press('Enter');
  await type(page, marker);

  // Prefer visible text over BlockSuite model internals (more stable for page edits).
  const noteText = page.getByText(marker);
  await expect(noteText).toBeVisible();
  await expect(undo).toBeEnabled();

  // Undo until the typed note text is gone (may take >1 history step).
  for (let i = 0; i < 30; i++) {
    if (!(await noteText.isVisible().catch(() => false))) break;
    if (await undo.isDisabled()) break;
    await undo.click();
  }
  await expect(page.getByText(marker)).toHaveCount(0);
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.getByText(marker)).toBeVisible();
});
