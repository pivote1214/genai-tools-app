import { test, expect } from '@playwright/test';

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Test model' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'claude', description: 'Test model' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'claude', description: 'Test model' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'claude', description: 'Test model' },
];

test.describe('モデル別送信', () => {
  for (const model of MODELS) {
    test(`${model.id} 選択時に正しいmodelで送信される`, async ({ page }) => {
      let capturedModel = '';

      await page.route('**/api/models', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MODELS),
        });
      });

      await page.route('**/api/chat', async (route) => {
        const body = route.request().postDataJSON() as { model?: string };
        capturedModel = body.model ?? '';
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: `data: {"content":"${model.id} OK"}\n\ndata: {"done":true}\n\n`,
        });
      });

      await page.goto('/');
      await page.locator('.model-selector').selectOption(model.id);
      await page.locator('.message-textarea').fill(`${model.id} test`);
      await page.locator('.send-button').click();

      await expect(page.locator('.message-assistant').last()).toContainText(`${model.id} OK`);
      expect(capturedModel).toBe(model.id);
    });
  }
});
