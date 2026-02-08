import { test, expect } from '@playwright/test';

test.describe('ストリーミングレスポンス', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('メッセージ送信時にローディング状態が表示される', async ({ page }) => {
    // APIレスポンスをモック（遅延を追加）
    await page.route('**/api/chat', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"content":"テスト"}\n\ndata: {"done":true}\n\n',
      });
    });

    await page.route('**/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' }
        ]),
      });
    });

    // メッセージを入力
    await page.locator('.message-textarea').fill('こんにちは');

    // 送信ボタンをクリック
    await page.locator('.send-button').click();

    // ローディングインジケーターが表示される
    await expect(page.locator('.loading-indicator')).toBeVisible();

    // 送信ボタンが無効化される
    await expect(page.locator('.send-button')).toBeDisabled();
  });

  test('ストリーミングレスポンスがリアルタイムで表示される', async ({ page }) => {
    // APIレスポンスをモック（段階的なストリーミング）
    await page.route('**/api/chat', async (route) => {
      const stream = [
        'data: {"content":"こん"}\n\n',
        'data: {"content":"にち"}\n\n',
        'data: {"content":"は"}\n\n',
        'data: {"done":true}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: stream,
      });
    });

    await page.route('**/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' }
        ]),
      });
    });

    // メッセージを入力して送信
    await page.locator('.message-textarea').fill('テスト');
    await page.locator('.send-button').click();

    // ユーザーメッセージが表示される
    await expect(page.locator('.message-user').last()).toContainText('テスト');

    // アシスタントメッセージが表示される（ストリーミング完了を待つ）
    await expect(page.locator('.message-assistant').last()).toBeVisible();

    // ストリーミング完了後、ローディングが解除される
    await expect(page.locator('.loading-indicator')).not.toBeVisible();
    await expect(page.locator('.send-button')).toBeEnabled();
  });

  test('ストリーミング完了後に新しいメッセージを送信できる', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"content":"返答"}\n\ndata: {"done":true}\n\n',
      });
    });

    await page.route('**/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' }
        ]),
      });
    });

    // 最初のメッセージを送信
    await page.locator('.message-textarea').fill('最初のメッセージ');
    await page.locator('.send-button').click();

    // ストリーミング完了を待つ
    await expect(page.locator('.send-button')).toBeEnabled();

    // 2番目のメッセージを送信できる
    await page.locator('.message-textarea').fill('2番目のメッセージ');
    await expect(page.locator('.send-button')).toBeEnabled();
    await page.locator('.send-button').click();

    // 両方のメッセージが表示される
    await expect(page.locator('.message-user')).toHaveCount(2);
  });
});
