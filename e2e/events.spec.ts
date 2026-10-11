import { expect, Page, test } from '@playwright/test';

const chart = (page: Page) =>
  page.getByRole('region', { name: 'Universe chart' });

const pickEvent = (page: Page, name: string) =>
  chart(page)
    .getByRole('button', { name: new RegExp(`^${name},`) })
    .click();

const pickUniverse = async (page: Page, name: string) => {
  await page.getByLabel('Universe', { exact: true }).click();
  await page.getByRole('option', { name, exact: true }).click();
};

const universeOptions = async (page: Page) => {
  await page.getByLabel('Universe', { exact: true }).click();
  const names = await page.getByRole('option').allTextContents();
  await page.keyboard.press('Escape');
  return names;
};

test('opens on the prime universe', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByText(/Select an event to branch/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Prime universe' }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole('button', { name: /^First Powered Flight,/ }),
  ).toBeVisible();
});

test('write an event by hand and keep it after a reload', async ({ page }) => {
  await page.goto('/en');
  await pickEvent(page, 'Financial Crisis');
  await page
    .getByRole('button', { name: 'Branch into a new universe' })
    .click();

  // No API key in tests, so the form starts in "write it yourself" mode.
  await expect(page.getByText(/No OpenAI API key is set up/)).toBeVisible();
  await page.getByLabel('Name of the new universe').fill('No bailout');
  await page.getByLabel('What happens').fill('Banks are left to fail');
  await page.getByLabel('Date').fill('2008-09-15');
  await page
    .getByLabel('Description')
    .fill('No bailouts. A long winter follows.');
  await page.getByRole('button', { name: 'Add event' }).click();

  await expect(page.getByText(/Universe "No bailout" begins/)).toBeVisible();
  await expect(chart(page).getByText('Universe No bailout')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Banks are left to fail' }),
  ).toBeVisible();

  await page.reload();
  await expect.poll(() => universeOptions(page)).toContain('No bailout');
});

test('generate an event, preview it and save it', async ({ page }) => {
  await page.route('**/api/ai-status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  let request: Record<string, unknown> | null = null;
  await page.route('**/api/generate', async (route) => {
    request = route.request().postDataJSON();
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({
      json: {
        draft: {
          name: 'The iPod flops',
          date: '2002-03-01',
          description: 'Nobody wants a thousand songs in their pocket.',
        },
      },
    });
  });

  await page.goto('/en');
  await pickEvent(page, 'Launch of the iPod');
  await page
    .getByRole('button', { name: 'Branch into a new universe' })
    .click();

  await expect(
    page.getByRole('radio', { name: 'Generate with AI' }),
  ).toBeChecked();
  await page.getByLabel('Name of the new universe').fill('No iPod');
  await page.getByLabel('What if…').fill('What if nobody bought the iPod?');
  await page.getByRole('button', { name: 'Generate' }).click();

  await expect(page.getByText(/writing the event/)).toBeVisible();
  await expect(page.getByLabel('What if…')).toBeDisabled();

  await expect(page.getByText('The iPod flops')).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(chart(page).getByText('Universe No iPod')).toBeVisible();

  expect(request).toMatchObject({
    eventType: 'Splinter',
    question: 'What if nobody bought the iPod?',
    newTimelineName: 'No iPod',
    event: { name: 'Launch of the iPod', timelineID: '1' },
  });
  const history = (request as unknown as { history: { name: string }[] })
    .history;
  expect(history.length).toBeGreaterThan(0);
  expect(history.length).toBeLessThanOrEqual(10);
  expect(history.at(-1)?.name).toBe('Launch of the iPod');
});

test('delete a universe and undo it', async ({ page }) => {
  await page.goto('/en');
  await pickUniverse(page, 'Prime');
  await pickEvent(page, 'Financial Crisis');
  await page
    .getByRole('button', { name: 'Branch into a new universe' })
    .click();
  await page.getByLabel('Name of the new universe').fill('Short lived');
  await page.getByLabel('What happens').fill('A brief detour');
  await page.getByRole('button', { name: 'Add event' }).click();
  await expect(
    page.getByRole('heading', { name: 'Universe Short lived' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Delete universe' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(
    page.getByRole('heading', { name: 'Prime universe' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Universe Short lived' }),
  ).toBeVisible();
});

test('export and import universes', async ({ page, browser }) => {
  await page.goto('/en');
  await pickEvent(page, 'Financial Crisis');
  await page
    .getByRole('button', { name: 'Branch into a new universe' })
    .click();
  await page.getByLabel('Name of the new universe').fill('Exported');
  await page.getByLabel('What happens').fill('Saved to a file');
  await page.getByRole('button', { name: 'Add event' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const file = await (await download).path();

  // A fresh browser with nothing saved.
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto('/en');
  await fresh.getByLabel('Import a file').setInputFiles(file!);
  await expect(
    fresh.getByText('Imported 1 event in 1 universe.'),
  ).toBeVisible();
  await expect.poll(() => universeOptions(fresh)).toContain('Exported');
});
