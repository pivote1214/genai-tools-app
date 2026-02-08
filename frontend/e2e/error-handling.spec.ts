import { test, expect } from '@playwright/test';

test.describe('エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // モデルAPIは正常にモック
    await page.route('**/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', description: 'Test model' }
        ]),
      });
    });
  });

  test('ネットワークエラー時にエラーメッセージが表示される', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/chat', async (route) => {
      await route.abort('failed');
    });

    // メッセージを入力して送信
    await page.locator('.message-textarea').fill('テストメッセージ');
    await page.locator('.send-button').click();

    // エラーバナーが表示される
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(/ネットワーク|エラー|失敗/);

    // 再度テキストを入力すると送信ボタンが有効化される（再試行可能）
    await page.locator('.message-textarea').fill('再試行メッセージ');
    await expect(page.locator('.send-button')).toBeEnabled();
  });

  test('APIエラー時にエラーメッセージが表示される', async ({ page }) => {
    // APIエラーをシミュレート（500エラー）
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error' }),
      });
    });

    // メッセージを入力して送信
    await page.locator('.message-textarea').fill('テストメッセージ');
    await page.locator('.send-button').click();

    // エラーバナーが表示される
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-message')).toBeVisible();

    // 再度テキストを入力すると送信ボタンが有効化される
    await page.locator('.message-textarea').fill('再試行メッセージ');
    await expect(page.locator('.send-button')).toBeEnabled();
  });

  test('レート制限エラー時に適切なメッセージが表示される', async ({ page }) => {
    // レート制限エラーをシミュレート
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"error":"リクエストが多すぎます。しばらく待ってから再試行してください"}\n\n',
      });
    });

    // メッセージを入力して送信
    await page.locator('.message-textarea').fill('テストメッセージ');
    await page.locator('.send-button').click();

    // エラーメッセージが表示される
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(/リクエストが多すぎます|再試行/);
  });

  test('エラー後に再試行できる', async ({ page }) => {
    let requestCount = 0;

    // 最初はエラー、2回目は成功
    await page.route('**/api/chat', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.abort('failed');
      } else {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"content":"成功しました"}\n\ndata: {"done":true}\n\n',
        });
      }
    });

    // 最初の送信（エラー）
    await page.locator('.message-textarea').fill('テストメッセージ');
    await page.locator('.send-button').click();

    // エラーが表示される
    await expect(page.locator('.error-banner')).toBeVisible();

    // 再試行
    await page.locator('.message-textarea').fill('再試行メッセージ');
    await page.locator('.send-button').click();

    // 成功メッセージが表示される
    await expect(page.locator('.message-assistant').last()).toContainText('成功しました');
  });

  test('エラーバナーを閉じることができる', async ({ page }) => {
    // エラーをシミュレート
    await page.route('**/api/chat', async (route) => {
      await route.abort('failed');
    });

    // メッセージを送信してエラーを発生させる
    await page.locator('.message-textarea').fill('テストメッセージ');
    await page.locator('.send-button').click();

    // エラーバナーが表示される
    await expect(page.locator('.error-banner')).toBeVisible();

    // 閉じるボタンをクリック
    await page.locator('.error-close').click();

    // エラーバナーが非表示になる
    await expect(page.locator('.error-banner')).not.toBeVisible();
  });
});
