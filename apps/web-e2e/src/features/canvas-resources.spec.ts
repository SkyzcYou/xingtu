import { test, expect } from '@playwright/test';

test('the resources menu and panel are absent at every supported viewport', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await expect(page.locator('.drawnix')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.unified-toolbar')).toBeVisible({ timeout: 30000 });

  for (const width of [390, 768, 769, 900, 1024, 1025, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId('canvas-resources')).toHaveCount(0);
    await expect(page.getByTestId('toolbar-resources')).toHaveCount(0);
  }
});
