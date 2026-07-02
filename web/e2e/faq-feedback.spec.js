import { test, expect } from '@playwright/test';

test.describe('FAQ & Feedback Pages', () => {
  // Reuses the storageState ('playwright/.auth/user.json') configured in playwright.config.js
  
  test('1. /faq page loads accordion items', async ({ page }) => {
    await page.goto('/faq');
    await expect(page).toHaveURL(/\/faq/);

    // Confirm heading is visible
    await expect(page.locator('h1')).toContainText('Frequently Asked Questions');

    // Confirm accordion item buttons exist
    const faqItem = page.locator('button.w-full.text-left').first();
    await expect(faqItem).toBeVisible();
    
    const questionText = await faqItem.innerText();
    expect(questionText.trim().length).toBeGreaterThan(0);
  });

  test('2. Clicking an accordion item expands and reveals answer', async ({ page }) => {
    await page.goto('/faq');

    const firstFAQButton = page.locator('button.w-full.text-left').first();
    
    // The answer should not be visible initially
    const answerText = 'FinKid is an interactive, AI-powered tutor';
    await expect(page.locator(`text=${answerText}`)).not.toBeVisible();

    // Click to expand
    await firstFAQButton.click();

    // Answer should now be visible
    await expect(page.locator(`text=${answerText}`)).toBeVisible();

    // Click again to collapse
    await firstFAQButton.click();
    await expect(page.locator(`text=${answerText}`)).not.toBeVisible();
  });

  test('3. /feedback page loads feedback form', async ({ page }) => {
    await page.goto('/feedback');
    await expect(page).toHaveURL(/\/feedback/);

    // Confirm heading is visible
    await expect(page.locator('h1')).toContainText('Send Feedback');

    // Check textarea is visible
    const messageField = page.locator('textarea#message');
    await expect(messageField).toBeVisible();

    // Check rating star buttons exist (5 buttons)
    const starButtons = page.locator('button[type="button"]');
    await expect(starButtons).toHaveCount(5);
  });

  test('4. Submitting feedback with rating and message shows success state', async ({ page }) => {
    await page.goto('/feedback');

    const messageField = page.locator('textarea#message');
    await messageField.fill('FinKid E2E testing: excellent financial literacy tool for kids!');

    // Click 5th star button (index 4) for a 5-star rating
    await page.locator('button[type="button"]').nth(4).click();

    // Click Submit
    await page.click('button[type="submit"]');

    // Verify success card is visible
    const successCard = page.locator('text=Thank you!');
    await expect(successCard).toBeVisible();

    const successMessage = page.locator('text=Your feedback helps us make FinKid better');
    await expect(successMessage).toBeVisible();
  });
});
