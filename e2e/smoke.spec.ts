import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const email = process.env.SMOKE_TEST_EMAIL;
const password = process.env.SMOKE_TEST_PASSWORD;

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('you@example.com').fill(email!);
  await page.getByPlaceholder('••••••••').fill(password!);
  await page.getByText('Log in', { exact: true }).click();
  await expect(page.getByPlaceholder('Add a todo...')).toBeVisible();
}

test.describe('signed out', () => {
  test('sign-in screen renders and switches to sign up', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/');
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();

    await page.getByText('Sign up', { exact: true }).click();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByText('Create account', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('signed in', () => {
  test.skip(!email || !password, 'Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env.local');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('add, edit, complete, and delete a todo', async ({ page }) => {
    const errors = collectPageErrors(page);
    const text = `Smoke test ${Date.now()}`;
    const edited = `${text} edited`;

    await page.getByPlaceholder('Add a todo...').fill(text);
    await page.getByPlaceholder('Add a todo...').press('Enter');
    await expect(page.getByRole('button', { name: `Open task ${text}`, exact: true })).toBeVisible();

    await page.getByRole('button', { name: `Open task ${text}`, exact: true }).click();
    await page.getByPlaceholder('Task', { exact: true }).fill(edited);
    await page.getByText('Save', { exact: true }).click();
    await expect(page.getByRole('button', { name: `Open task ${edited}`, exact: true })).toBeVisible();

    await page.getByRole('checkbox', { name: `Complete ${edited}`, exact: true }).click();
    await expect(page.getByRole('checkbox', { name: `Mark ${edited} as not done`, exact: true })).toBeChecked();

    // Clean up: Delete in the edit dialog moves the todo to Deleted.
    await page.getByRole('button', { name: `Open task ${edited}`, exact: true }).click();
    await page.getByText('Delete', { exact: true }).click();
    await expect(page.getByRole('button', { name: `Open task ${edited}`, exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('main views open', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.getByText('Projects', { exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Create project' }).first()).toBeVisible();

    await page.getByText('Maps', { exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'New map' })).toBeVisible();

    await page.getByText('Calendar', { exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Show today' })).toBeVisible();

    await page.getByText('Workspace', { exact: true }).first().click();
    await expect(page.getByPlaceholder('Add a todo...')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('export my data downloads a RodoFlow export', async ({ page }) => {
    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByText('Settings', { exact: true }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Export my data', { exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^rodoflow-export-\d{4}-\d{2}-\d{2}\.json$/);

    const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(exported.format).toBe('rodoflow-export');
    expect(exported.profile.email).toBe(email!.toLowerCase());
    expect(Array.isArray(exported.todos)).toBe(true);
  });

  test('delete account dialog requires typing DELETE', async ({ page }) => {
    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByText('Settings', { exact: true }).click();
    await page.getByText('Delete account', { exact: true }).click();

    // Never confirm: this only checks the safeguard on the shared test account.
    const confirmButton = page.getByRole('button', { name: 'Delete account' });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
    await page.getByLabel('Type DELETE to confirm account deletion').fill('delete me');
    await expect(confirmButton).toHaveAttribute('aria-disabled', 'true');
    await page.getByText('Cancel', { exact: true }).click();
    await expect(confirmButton).toHaveCount(0);
  });
});
