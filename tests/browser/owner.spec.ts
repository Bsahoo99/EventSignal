import { test, expect } from '@playwright/test';
test('owner edits profile and gets actionable credential setup without losing input', async ({
  page,
}) => {
  await page.goto('/owner');
  await page
    .getByLabel('Owner access token')
    .fill('local-test-token-at-least-32-characters');
  await page.getByLabel('Target roles').fill('Backend Engineer');
  await page
    .getByLabel('Public event text')
    .fill('Speaker Ada Chen presents agents and evaluation.');
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'GEMINI_API_KEY' }),
  ).toContainText('GEMINI_API_KEY');
  await expect(page.getByLabel('Target roles')).toHaveValue('Backend Engineer');
});

test('edited profile reaches the workflow, shows loading and renders the returned brief', async ({
  page,
}) => {
  const { analyze } = await import('../../lib/server/analysis');
  const { createTestDependencies, eventText } = await import('../fixtures');
  await page.route('**/api/analyze', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = await analyze(
      route.request().postDataJSON(),
      createTestDependencies(),
    );
    await route.fulfill({ json: result });
  });
  await page.goto('/owner');
  await page
    .getByLabel('Owner access token')
    .fill('local-test-token-at-least-32-characters');
  await page.getByLabel('Target roles').fill('Backend Engineer');
  await page
    .getByLabel('Experience and project evidence')
    .fill('I build agents for customer deployments.');
  await page.getByLabel('Public event text').fill(eventText);
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(page.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Ada Chen' })).toBeVisible();
  await page.getByLabel('Prepare a conversation').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(/Hi, I’m interested in Backend Engineer/),
  ).toBeVisible();
  expect(
    await page
      .locator('body')
      .evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test('failed URL reading offers pasted fallback while retaining the profile', async ({
  page,
}) => {
  const { analyze } = await import('../../lib/server/analysis');
  const { createTestDependencies, eventText } = await import('../fixtures');
  await page.route('**/api/analyze', async (route) => {
    const result = await analyze(
      route.request().postDataJSON(),
      createTestDependencies({
        readPage: async () => {
          throw new Error('blocked');
        },
      }),
    );
    await route.fulfill({ json: result });
  });
  await page.goto('/owner');
  await page
    .getByLabel('Owner access token')
    .fill('local-test-token-at-least-32-characters');
  await page.getByLabel('Target roles').fill('Backend Engineer');
  await page.getByLabel('Event input').selectOption('url');
  await page.getByLabel('Public event URL').fill('https://events.example.org');
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await page.getByRole('button', { name: 'Continue with pasted text' }).click();
  await expect(page.getByLabel('Target roles')).toHaveValue('Backend Engineer');
  await page.getByLabel('Public event text').fill(eventText);
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(page.getByRole('heading', { name: 'Ada Chen' })).toBeVisible();
});

test('empty, budget and provider states give next steps', async ({ page }) => {
  const { analyze } = await import('../../lib/server/analysis');
  const { createTestDependencies, eventText, extraction } =
    await import('../fixtures');
  const { Budget } = await import('../../lib/server/budget');
  let scenario = 'empty';
  await page.route('**/api/analyze', async (route) => {
    const deps = createTestDependencies(
      scenario === 'budget'
        ? { budget: new Budget('/nonexistent/budget.sqlite') }
        : {
            extract: async () => {
              if (scenario === 'provider') throw new Error('timeout');
              return { data: { ...extraction, entities: [] } };
            },
          },
    );
    await route.fulfill({
      json: await analyze(route.request().postDataJSON(), deps),
    });
  });
  await page.goto('/owner');
  await page
    .getByLabel('Owner access token')
    .fill('local-test-token-at-least-32-characters');
  await page.getByLabel('Public event text').fill(eventText);
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Not enough evidence for a useful connection.',
    }),
  ).toBeVisible();
  scenario = 'budget';
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Budget unavailable' }),
  ).toBeVisible();
  scenario = 'provider';
  await page.getByRole('button', { name: 'Analyze event' }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'model did not return usable evidence' }),
  ).toBeVisible();
});
