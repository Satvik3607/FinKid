import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  const timestamp = Date.now();
  const testEmail = `auth-spec-${timestamp}@gmail.com`;
  const testUsername = `user_auth_${timestamp}`;
  const testPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Print page console messages and errors to debug
    page.on('console', msg => console.log(`AUTH SPEC PAGE LOG: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log('AUTH SPEC PAGE ERROR:', err.stack || err.message));

    // Intercept all Supabase Auth API calls to mock them, preventing rate limit errors
    await page.route('**/auth/v1/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      console.log(`INTERCEPTED Supabase URL: [${method}] ${url}`);

      if (url.includes('/signup') && method === 'POST') {
        const body = JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
            email: testEmail,
            user_metadata: { username: testUsername }
          }
        });
        console.log('Fulfilling signup request with flat mock data');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: body
        });
      }

      if (url.includes('/token') && method === 'POST') {
        const body = JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
            email: testEmail,
            user_metadata: { username: testUsername }
          }
        });
        console.log('Fulfilling token request with flat mock data');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: body
        });
      }

      if (url.includes('/user') && method === 'GET') {
        const body = JSON.stringify({
          id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
          email: testEmail,
          user_metadata: { username: testUsername }
        });
        console.log('Fulfilling user request with mock data');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: body
        });
      }

      if (url.includes('/logout') && method === 'POST') {
        console.log('Fulfilling logout request');
        return route.fulfill({
          status: 204
        });
      }

      // Allow other Supabase calls to continue normally
      return route.continue();
    });
  });

  test('1. Landing page loads and shows primary CTA buttons', async ({ page }) => {
    await page.goto('/');
    
    // Confirm landing page heading
    await expect(page.locator('h1')).toContainText('Learn About Money');

    // Confirm Create My Account and Log In buttons are present
    const createBtn = page.getByRole('button', { name: 'Create My Account' });
    const loginLink = page.getByRole('button', { name: 'Log In' });
    
    await expect(createBtn).toBeVisible();
    await expect(loginLink).toBeVisible();
  });

  test('2. Signup flow redirects to /chat', async ({ page }) => {
    await page.goto('/');
    
    // Click signup button to navigate to signup page
    await page.getByRole('button', { name: 'Create My Account' }).click();
    await page.waitForURL(/\/signup/);

    // Fill registration form
    await page.fill('input[placeholder="Pick a cool name"]', testUsername);
    await page.fill('input[placeholder="your@email.com"]', testEmail);
    await page.fill('input[placeholder="At least 6 characters"]', testPassword);
    await page.selectOption('select', '11-13');

    // Submit and verify redirection to /chat
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat/, { timeout: 15000 });
    
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('header')).toContainText(`Hey, ${testUsername}!`);
  });

  test('3. Login flow from /login redirects to /chat', async ({ page }) => {
    // Go directly to login page since the spec runs in a clean, unauthenticated context
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Fill credentials on login page
    await page.fill('input[placeholder="your@email.com"]', testEmail);
    await page.fill('input[placeholder="Your password"]', testPassword);
    
    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('header')).toContainText(`Hey, ${testUsername}!`);
  });

  test('4. Protected routes redirect to /login', async ({ page }) => {
    // Try visiting /chat directly (starting logged out)
    await page.goto('/chat');
    
    // Verify it redirects back to /login
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
