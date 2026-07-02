import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Listen for console and page errors to debug the loading hang
  page.on('console', msg => console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.message));

  const testEmail = 'chat_test_debug@gmail.com';
  const testPassword = 'Password123!Test';

  console.log(`Setting up test session using existing user: ${testEmail}`);

  // Navigate to login page
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  // Fill in login details
  await page.fill('input[placeholder="your@email.com"]', testEmail);
  await page.fill('input[placeholder="Your password"]', testPassword);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for redirect to /chat
  await page.waitForURL(/\/chat/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/chat/);

  // Wait for loading to finish (the greeting or header should appear)
  // We'll give it up to 20 seconds
  console.log('Waiting for header to appear on /chat...');
  await expect(page.locator('header')).toContainText('Hey,', { timeout: 20000 });

  // Save storage state to reuse across other tests
  await page.context().storageState({ path: authFile });
  console.log('Session state successfully saved.');
});
