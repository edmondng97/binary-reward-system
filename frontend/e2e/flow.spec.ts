import { test, expect } from '@playwright/test';

// Requires the full stack running: mongo+redis, backend :3100, frontend :3000.
// Each run assumes a fresh DB (drop binary_demo before running) to keep usernames unique.

test('happy path: register, order, settle, wallet credited', async ({ page }) => {
  await page.goto('/');

  // create root
  await page.fill('input[name="root"]', 'root');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-node-id]')).toHaveCount(1, { timeout: 10_000 });

  // register alice (L) and bob (R) under root
  const reg = async (username: string, position: 'L' | 'R') => {
    await page.getByPlaceholder('new username').fill(username);
    await page.getByPlaceholder('sponsor').fill('root');
    await page.getByPlaceholder('placement').fill('root');
    // The position select is the first select inside the RegisterPanel card
    await page.locator('aside select').first().selectOption(position);
    await page.getByRole('button', { name: 'Register' }).click();
  };
  await reg('alice', 'L');
  await expect(page.locator('[data-node-id]')).toHaveCount(2, { timeout: 10_000 });
  await reg('bob', 'R');
  await expect(page.locator('[data-node-id]')).toHaveCount(3, { timeout: 10_000 });

  // place orders
  await page.getByPlaceholder('username', { exact: true }).fill('alice');
  await page.getByPlaceholder('amount').fill('5000');
  await page.getByRole('button', { name: 'Order' }).click();

  await page.getByPlaceholder('username', { exact: true }).fill('bob');
  await page.getByPlaceholder('amount').fill('3500');
  await page.getByRole('button', { name: 'Order' }).click();

  // settle
  await page.getByRole('button', { name: 'Run settlement now' }).click();
  await expect(page.getByText('settlement done')).toBeVisible({ timeout: 15_000 });

  // wallet: select root member (option label "@root") and assert balance
  await page.locator('aside select').last().selectOption({ label: '@root' });
  await expect(page.getByText('$350.0000')).toBeVisible({ timeout: 10_000 });
});

test('occupied leg shows an error', async ({ page }) => {
  // Depends on happy-path having run first (alice occupies root-L)
  await page.goto('/');

  await page.getByPlaceholder('new username').fill('dup');
  await page.getByPlaceholder('sponsor').fill('root');
  await page.getByPlaceholder('placement').fill('root');
  await page.locator('aside select').first().selectOption('L'); // root-L taken by alice
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText(/occupied/i)).toBeVisible({ timeout: 10_000 });
});

test('non-positive order is rejected', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('username', { exact: true }).fill('alice');
  await page.getByPlaceholder('amount').fill('0');
  await page.getByRole('button', { name: 'Order' }).click();
  await expect(page.getByText(/amount must be positive/i)).toBeVisible({ timeout: 10_000 });
});
