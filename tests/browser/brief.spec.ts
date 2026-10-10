import { test, expect } from '@playwright/test';
test('visitor explores a historical brief and its evidence without research', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Your next conversation, with context.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Saved historical example', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Prepare a conversation', { exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'A starting point' }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Read event evidence' }).first(),
  ).toHaveAttribute('href', /^https:\/\/ai.engineer\//);
  expect(
    (await request.post('/api/analyze', { data: {} })).status(),
  ).toBeGreaterThanOrEqual(400);
  expect(
    await page
      .locator('body')
      .evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
