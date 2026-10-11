import { expect, test } from '@playwright/test';

const SCREENSHOTS = process.env.CHART_SCREENSHOTS;

test('switch to the scrolling view and keep it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en');
  await expect(page.getByRole('radio', { name: 'Free move' })).toBeChecked();

  await page.getByRole('radio', { name: 'Scroll' }).click();
  const chart = page.getByRole('region', { name: 'Universe chart' });
  await expect(chart.locator('svg')).toBeVisible();

  // Opens on the latest events; selecting one fills the sidebar.
  await chart.getByRole('button', { name: /^Financial Crisis,/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Financial Crisis' }),
  ).toBeVisible();
  if (SCREENSHOTS)
    await page.screenshot({ path: `${SCREENSHOTS}/scroll-prime.png` });

  // A universe name on the left opens that universe.
  await page.getByLabel('Universe', { exact: true }).click();
  await page.getByRole('option', { name: 'All universes' }).click();
  await page.getByRole('button', { name: 'Universe 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Universe 2' })).toBeVisible();
  if (SCREENSHOTS)
    await page.screenshot({ path: `${SCREENSHOTS}/scroll-u2.png` });

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Scroll' })).toBeChecked();
  if (SCREENSHOTS) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${SCREENSHOTS}/scroll-phone.png` });
  }
});
