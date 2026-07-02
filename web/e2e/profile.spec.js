import { test, expect } from '@playwright/test';

test.describe('Profile & Gamification', () => {
  // Mock state that persists during a single test run
  let userProfile = {
    id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
    display_name: 'Original Kid',
    avatar_id: 'avatar_1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  test.beforeEach(async ({ page }) => {
    // Reset mock profile before each test
    userProfile.display_name = 'Original Kid';
    userProfile.avatar_id = 'avatar_1';

    // Intercept Supabase users API calls to mock GET (fetch) and PATCH (update)
    await page.route('**/rest/v1/users*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([userProfile])
        });
      }
      if (method === 'PATCH' || method === 'PUT') {
        const payload = route.request().postDataJSON();
        if (payload.display_name) {
          userProfile.display_name = payload.display_name;
        }
        if (payload.avatar_id) {
          userProfile.avatar_id = payload.avatar_id;
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([userProfile])
        });
      }
      return route.continue();
    });

    // Intercept Supabase user_stats API calls to return mock stats
    await page.route('**/rest/v1/user_stats*', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            user_id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
            total_points: 120,
            current_level: 'Money Newbie',
            badges_earned: ['first_step'],
            quiz_correct_count: 1
          }])
        });
      }
      return route.continue();
    });

    // Print page console messages and errors to debug
    page.on('console', msg => console.log(`PROFILE SPEC PAGE LOG: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log('PROFILE SPEC PAGE ERROR:', err.stack || err.message));

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
  });

  test('1. /profile page loads without crashing and shows stats', async ({ page }) => {
    // Confirm profile card is visible
    const profileHeader = page.locator('h2');
    await expect(profileHeader).toBeVisible();
    const nameText = await profileHeader.innerText();
    expect(nameText.trim()).toBe('Original Kid');
  });

  test('2. Shows level name and total points', async ({ page }) => {
    // Confirm level badge is visible (e.g. Money Newbie)
    const levelBadge = page.locator('main .bg-brand-50');
    await expect(levelBadge).toBeVisible();
    const levelText = await levelBadge.innerText();
    expect(levelText.trim()).toBe('Money Newbie');

    // Confirm XP points are visible
    const pointsLabel = page.locator('text=Total Points');
    await expect(pointsLabel).toBeVisible();
    
    const xpText = page.locator('text=XP').first();
    await expect(xpText).toBeVisible();
  });

  test('3. Badge cabinet is visible with badges shown', async ({ page }) => {
    // Confirm badge cabinet header is visible
    const cabinetHeader = page.locator('h3:has-text("Badge Cabinet")');
    await expect(cabinetHeader).toBeVisible();

    // Confirm at least one badge is rendered
    const badgeItem = page.locator('main h4').first();
    await expect(badgeItem).toBeVisible();
    const badgeTitle = await badgeItem.innerText();
    expect(badgeTitle.trim().length).toBeGreaterThan(0);
  });

  test('4. Edit profile: display name changes persist after saving and reloading', async ({ page }) => {
    const newName = `E2E Kid ${Date.now()}`;

    console.log(`Original Name: ${userProfile.display_name}`);
    console.log(`Setting New Name: ${newName}`);

    // Click edit profile button
    await page.click('button[title="Edit Profile"]');

    // Display name input field should be visible
    const nameInput = page.locator('input[placeholder="What should we call you?"]');
    await expect(nameInput).toBeVisible();
    
    // Change name
    await nameInput.fill(newName);

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Confirm UI updates with new name immediately
    await expect(page.locator('h2')).toContainText(newName);

    // Reload page to verify persistence in our mock state
    await page.reload();
    await page.waitForURL(/\/profile/);

    // Confirm new name persists
    await expect(page.locator('h2')).toContainText(newName);
  });
});
