import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
});

test('creates, configures, previews, and exports a required text field', async ({ page }) => {
  await openBlankBuilder(page);
  await page.getByTestId('form-title-input').fill('Customer intake');
  await page.getByTestId('add-field-text').click();

  const cards = page.getByTestId('field-card');
  await expect(cards).toHaveCount(1);
  await cards.first().click();

  await page.getByTestId('field-label-input').fill('Full name');
  await page.getByTestId('field-key-input').fill('fullName');
  await page.getByRole('tab', { name: 'Validation' }).click();
  await page.getByTestId('field-required-toggle').click();

  await page.getByRole('button', { name: 'Preview' }).click();
  const preview = page.getByTestId('preview-form');
  const previewInput = preview.getByLabel('Full name');
  await expect(previewInput).toBeVisible();

  await preview.getByRole('button', { name: /submit|отправить/i }).click();
  await expect(previewInput).toHaveAttribute('aria-invalid', 'true');

  await previewInput.fill('Ada Lovelace');
  await expect(previewInput).toHaveValue('Ada Lovelace');
  await page.getByRole('button', { name: 'Close preview' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-json').click();
  await page.getByRole('button', { name: 'Download file' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('The browser did not provide an exported file path.');

  const exported = JSON.parse(await readFile(downloadPath, 'utf8')) as {
    schemaVersion: number;
    title: string;
    fields: Array<{
      key: string;
      label: string;
      validation: { required?: boolean };
    }>;
  };

  expect(exported.schemaVersion).toBe(1);
  expect(exported.title).toBe('Customer intake');
  expect(exported.fields).toHaveLength(1);
  expect(exported.fields[0]).toMatchObject({
    key: 'fullName',
    label: 'Full name',
    validation: { required: true },
  });
});

test('imports a valid version 1 document', async ({ page }) => {
  await page.getByTestId('import-file-input').setInputFiles({
    name: 'customer-request.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(validDocument)),
  });

  await expect(page.getByTestId('form-title-input')).toHaveValue('Customer request');
  await expect(page.getByTestId('field-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('preview-form').getByLabel('Email address')).toBeVisible();
});

test('rejects invalid JSON without replacing current work', async ({ page }) => {
  await openBlankBuilder(page);
  await page.getByTestId('form-title-input').fill('Keep this form');
  await page.getByTestId('add-field-email').click();

  await page.getByTestId('import-file-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":1,"fields":['),
  });

  await expect(page.getByTestId('import-error')).toBeVisible();
  await expect(page.getByTestId('form-title-input')).toHaveValue('Keep this form');
  await expect(page.getByTestId('field-card')).toHaveCount(1);
});

test('duplicates, reorders, and deletes fields', async ({ page }) => {
  await openBlankBuilder(page);
  await page.getByTestId('add-field-text').click();
  await page.getByTestId('add-field-email').click();

  const cards = page.getByTestId('field-card');
  await expect(cards).toHaveCount(2);

  await cards.first().click();
  await page.locator('.field-card.is-selected').getByTestId('duplicate-field').click();
  await expect(cards).toHaveCount(3);

  await page.locator('.field-card.is-selected').getByTestId('move-field-down').click();
  await page.locator('.field-card.is-selected').getByTestId('move-field-up').click();

  await page.locator('.field-card.is-selected').getByTestId('delete-field').click();
  await expect(cards).toHaveCount(2);
});

test('supports the essential builder flow with a keyboard', async ({ page }) => {
  await openBlankBuilder(page);
  const addText = page.getByTestId('add-field-text');
  await addText.focus();
  await page.keyboard.press('Enter');

  const card = page.getByTestId('field-card').first();
  await expect(card).toBeVisible();

  const labelInput = page.getByTestId('field-label-input');
  await labelInput.focus();
  await expect(labelInput).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Keyboard-created field');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('preview-form').getByLabel('Keyboard-created field')).toBeVisible();
});

async function openBlankBuilder(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /^create a form$/i }).click();
  await expect(page).toHaveURL(/#\/builder\//);
  await expect(page.getByTestId('form-title-input')).toBeVisible();
}

const validDocument = {
  schemaVersion: 1,
  id: 'form_550e8400-e29b-41d4-a716-446655440000',
  title: 'Customer request',
  description: 'A browser-test fixture.',
  locale: 'en',
  submitLabel: 'Send request',
  fields: [
    {
      id: 'field_550e8400-e29b-41d4-a716-446655440001',
      key: 'contactMethod',
      type: 'select',
      label: 'Contact method',
      description: '',
      placeholder: '',
      defaultValue: 'email',
      width: 'half',
      options: [
        {
          id: 'option_550e8400-e29b-41d4-a716-446655440003',
          label: 'Email',
          value: 'email',
        },
        {
          id: 'option_550e8400-e29b-41d4-a716-446655440004',
          label: 'Phone',
          value: 'phone',
        },
      ],
      validation: { required: true },
    },
    {
      id: 'field_550e8400-e29b-41d4-a716-446655440002',
      key: 'emailAddress',
      type: 'email',
      label: 'Email address',
      description: '',
      placeholder: 'name@example.com',
      width: 'half',
      options: [],
      validation: { required: true },
      condition: {
        action: 'show',
        sourceFieldId: 'field_550e8400-e29b-41d4-a716-446655440001',
        operator: 'equals',
        value: 'email',
      },
    },
  ],
  createdAt: '2026-10-19T12:00:00.000Z',
  updatedAt: '2026-10-19T12:00:00.000Z',
};
