import { expect, Page, test } from '@playwright/test';

const SCREENSHOTS = process.env.LOG_SCREENSHOTS;
const shot = async (page: Page, name: string) => {
  if (SCREENSHOTS)
    await page.screenshot({ path: `${SCREENSHOTS}/${name}.png` });
};

test('read a universe as a terminal log', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en');
  await page.getByLabel('Universe', { exact: true }).click();
  await page.getByRole('option', { name: '2', exact: true }).click();
  await page.getByRole('link', { name: 'Open log' }).click();

  await expect(page).toHaveURL(/\/en\/universe\/2\/log$/);
  await expect(
    page.getByRole('heading', { name: 'UNIVERSE 2 :: CHRONICLE LOG' }),
  ).toBeVisible();
  await shot(page, 'log-top');

  await page.getByLabel('> GOTO YEAR').fill('1989');
  await page.keyboard.press('Enter');
  await expect(page.getByText('*** DIVERGENCE DETECTED ***')).toBeInViewport();
  await shot(page, 'log-fork');

  // Opens again where the reader left off, once the position is saved.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem('parallel-universes') ?? '{}',
        );
        const pageIndex = saved.state?.bookPages?.['2'];
        return document.getElementById(`log-${pageIndex}`)?.textContent ?? '';
      }),
    )
    .toMatch(/fall of the berlin wall/i);
  await page.reload();
  await expect(page.getByText('*** DIVERGENCE DETECTED ***')).toBeInViewport();
});

test('old book links open the log', async ({ page }) => {
  await page.goto('/en/universe/1/book?event=43');
  await expect(page).toHaveURL(/\/en\/universe\/1\/log\?event=43$/);
  await expect(
    page.getByRole('heading', { name: 'Fall of the Berlin Wall' }),
  ).toBeInViewport();
});

test('the AI writes a missing personal log once and it is kept', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/ai-status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  let calls = 0;
  await page.route('**/api/journal', async (route) => {
    calls += 1;
    const { event } = route.request().postDataJSON();
    await route.fulfill({
      json: { journal: `Day log. Today: ${event.name}. Nobody slept.` },
    });
  });

  await page.goto('/en/universe/1/log?event=1');
  await expect(
    page.getByText('Day log. Today: First Powered Flight. Nobody slept.'),
  ).toBeVisible();
  await shot(page, 'log-entry');

  const before = calls;
  await page.reload();
  await expect(
    page.getByText('Day log. Today: First Powered Flight. Nobody slept.'),
  ).toBeVisible();
  expect(calls).toBe(before);
});

test('the log on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/universe/The%20Moon%20Base/log');
  await expect(
    page.getByRole('heading', {
      name: 'UNIVERSE The Moon Base :: CHRONICLE LOG',
    }),
  ).toBeVisible();
  await page.getByLabel('> GOTO YEAR').fill('1969');
  await page.keyboard.press('Enter');
  await expect(page.getByText('*** DIVERGENCE DETECTED ***')).toBeInViewport();
  await shot(page, 'log-phone');
});
