import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('dashboard has no automatically detectable WCAG A or AA violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('configured preview has no automatically detectable WCAG A or AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^create a form$/i }).click();
  await expect(page).toHaveURL(/#\/builder\//);
  await page.getByTestId('add-field-text').click();
  await page.getByTestId('field-card').first().click();
  await page.getByTestId('field-label-input').fill('Project name');
  await page.getByRole('tab', { name: 'Validation' }).click();
  await page.getByTestId('field-required-toggle').click();
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('preview-form').getByLabel('Project name')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('workspace reflows at a narrow viewport without page-level horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
