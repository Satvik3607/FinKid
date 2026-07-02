import { test, expect } from '@playwright/test';

test.describe('Core Chat Functionality', () => {
  let conversationsList = [];

  test.beforeEach(async ({ page }) => {
    // Clear mock conversations before each test
    conversationsList = [];

    // Intercept Supabase conversations GET requests
    await page.route('**/rest/v1/conversations*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(conversationsList)
        });
      }
      return route.continue();
    });

    // Intercept FastAPI chat API to mock LLM replies, charts, and follow-ups
    await page.route('**/api/chat', async (route) => {
      const payload = route.request().postDataJSON();
      const userMessage = payload.message || 'what is compound interest';
      
      // Simulate backend saving the conversation by updating our mock state
      const conversationId = 'mock-conv-1';
      const hasConversation = conversationsList.some(c => c.id === conversationId);
      if (!hasConversation) {
        conversationsList.push({
          id: conversationId,
          user_id: '0f1a17c8-4a1d-43d0-8842-5f22ee192c73',
          title: userMessage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Here is a clear explanation about: "${userMessage}". It is very important to learn about money!`,
          conversation_id: conversationId,
          sources: [
            {
              source: 'saving_basics',
              text: 'Saving is critical for future success.',
              score: 0.95
            }
          ],
          follow_up_questions: [
            'Can you explain it more?',
            'What is simple interest?',
            'Why do banks pay interest?'
          ],
          chart: {
            type: 'line',
            title: 'Interest Over Time',
            labels: ['Year 1', 'Year 2', 'Year 3'],
            data: [100, 105, 110]
          }
        })
      });
    });

    // Go to chat page
    await page.goto('/chat');
    await page.waitForURL(/\/chat/);
  });

  test('1. After login, chat page loads with greeting and suggested question chips', async ({ page }) => {
    // Expect greeting message (e.g. "Good morning!", "Good afternoon!", "Good evening!", "Up late?")
    const header = page.locator('h2');
    await expect(header).toBeVisible();
    
    // Confirms suggested question chips are visible
    const budgetChip = page.getByRole('button', { name: 'What is a budget?', exact: true });
    const interestChip = page.getByRole('button', { name: 'What is compound interest?', exact: true });
    
    await expect(budgetChip).toBeVisible();
    await expect(interestChip).toBeVisible();
  });

  test('2. Sending a message and receiving a reply', async ({ page }) => {
    const chatInput = page.locator('input[placeholder="Ask me anything about money!"]');
    await expect(chatInput).toBeVisible();

    // Type query
    await chatInput.fill('what is compound interest');
    
    // Click send
    await page.click('button[aria-label="Send message"]');

    // Wait for the assistant's reply bubble to appear
    const assistantBubble = page.locator('.message-enter.justify-start').first();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });

    // Confirm that the reply text is not empty and matches our mock
    const replyText = await assistantBubble.locator('.prose').innerText();
    expect(replyText).toContain('what is compound interest');
  });

  test('3. Follow-up question chips appear below the reply', async ({ page }) => {
    const chatInput = page.locator('input[placeholder="Ask me anything about money!"]');
    await chatInput.fill('what is a budget');
    await page.click('button[aria-label="Send message"]');

    // Wait for reply
    const assistantBubble = page.locator('.message-enter.justify-start').first();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });

    // Check that follow-up chip buttons exist under the assistant's response.
    // The text-to-speech button has class rounded-md (or similar) whereas the chips have class rounded-full.
    const followUpBtn = assistantBubble.locator('button.rounded-full').first();
    await expect(followUpBtn).toBeVisible();
    const followUpText = await followUpBtn.innerText();
    expect(followUpText).toBe('Can you explain it more?');
  });

  test('4. New Chat button clears the current conversation', async ({ page }) => {
    const chatInput = page.locator('input[placeholder="Ask me anything about money!"]');
    await chatInput.fill('tell me a short money tip');
    await page.click('button[aria-label="Send message"]');

    const assistantBubble = page.locator('.message-enter.justify-start').first();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });

    // Click "New Chat" in the sidebar
    await page.click('button:has-text("New Chat")');

    // Confirm conversation is cleared (bubbles disappear, input is reset, suggestions are shown again)
    await expect(page.locator('.message-enter')).toHaveCount(0);
    const budgetChip = page.getByRole('button', { name: 'What is a budget?', exact: true });
    await expect(budgetChip).toBeVisible();
  });

  test('5. Past conversation appears in the sidebar after sending a message', async ({ page }) => {
    const chatInput = page.locator('input[placeholder="Ask me anything about money!"]');
    await chatInput.fill('how do banks work');
    await page.click('button[aria-label="Send message"]');

    const assistantBubble = page.locator('.message-enter.justify-start').first();
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });

    // Confirm sidebar history list is updated with the title of our message
    const sidebarHistoryItem = page.locator('button:has-text("how do banks work")').first();
    await expect(sidebarHistoryItem).toBeVisible();
  });
});
