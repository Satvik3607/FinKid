import { test, expect } from '@playwright/test';

test.describe('Courses and Lesson Flow', () => {
  // Reuses the storageState ('playwright/.auth/user.json') configured in playwright.config.js
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await expect(page).toHaveURL(/\/courses/);
  });

  test('1. Courses page loads and shows at least one course card', async ({ page }) => {
    // Wait for courses to load (loader goes away)
    await expect(page.locator('h1')).toContainText('Learning Roadmap');

    // Confirm that at least one course card is visible
    const courseCard = page.locator('a[href^="/courses/"]').first();
    await expect(courseCard).toBeVisible();

    // Confirm course title is visible inside the card
    const courseTitle = courseCard.locator('h2');
    await expect(courseTitle).toBeVisible();
    const titleText = await courseTitle.innerText();
    expect(titleText.trim().length).toBeGreaterThan(0);
  });

  test('2. Clicking a course navigates to course detail page with lessons', async ({ page }) => {
    const courseCard = page.locator('a[href^="/courses/"]').first();
    const titleText = await courseCard.locator('h2').innerText();
    
    // Click the course
    await courseCard.click();
    
    // Should navigate to /courses/course-id
    await page.waitForURL(/\/courses\/[a-zA-Z0-9_-]+/);
    await expect(page.locator('h1')).toContainText(titleText);
    
    // Confirm there is a list of lessons
    const lessonItem = page.locator('a[href^="/courses/"]').first();
    await expect(lessonItem).toBeVisible();
    await expect(lessonItem.locator('h3')).toBeVisible();
  });

  test('3. Navigating to a lesson shows content, tooltips, and quiz', async ({ page }) => {
    // Go to first course
    const courseCard = page.locator('a[href^="/courses/"]').first();
    await courseCard.click();
    await page.waitForURL(/\/courses\/[a-zA-Z0-9_-]+/);

    // Click the first lesson
    // We select any link starting with "/courses/" that is not the back button ("/courses")
    const lessonLink = page.locator('a[href^="/courses/"]:not([href="/courses"])').first();
    await expect(lessonLink).toBeVisible();
    await lessonLink.click();

    // Should navigate to /courses/course-id/lesson-id
    await page.waitForURL(/\/courses\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/);
    
    // Confirm lesson title is visible
    const lessonTitle = page.locator('article h1');
    await expect(lessonTitle).toBeVisible();

    // 4. Hover over technical term tooltip and confirm visibility
    // In LessonContent, tooltips are elements with class "group inline-block" or "cursor-pointer"
    const termElement = page.locator('span.group.relative.inline-block.cursor-pointer').first();
    await expect(termElement).toBeVisible();
    
    const wordSpan = termElement.locator('span').first();
    const tooltipSpan = termElement.locator('span').nth(1);
    
    // Initially the tooltip is hidden
    await expect(tooltipSpan).not.toBeVisible();

    // Hover to reveal
    await wordSpan.hover();
    await expect(tooltipSpan).toBeVisible();

    // Check that tooltip contains description
    const tooltipText = await tooltipSpan.innerText();
    expect(tooltipText.trim().length).toBeGreaterThan(0);

    // 5. Quiz appears at the bottom of the lesson
    const quizSection = page.locator('h3:has-text("Knowledge Check"), h3:has-text("Think About It")');
    await expect(quizSection).toBeVisible();
  });
});
