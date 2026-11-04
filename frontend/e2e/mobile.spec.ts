import { expect, test } from '@playwright/test';

test('mobile layout: bottom tab bar navigation and bottom-sheet details', async ({ page }) => {
  await page.goto('/');
  const tabs = page.getByRole('navigation', { name: 'Main' }).last();
  await expect(tabs).toBeVisible();
  await tabs.getByRole('link', { name: 'India' }).click();
  await expect(page.getByRole('heading', { name: 'India explorer' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await tabs.getByRole('link', { name: 'Map' }).click();
  await page.locator('.leaflet-container').click({ position: { x: 200, y: 300 } });
  await expect(page.getByRole('article', { name: /Details for/ })).toBeVisible();
});
