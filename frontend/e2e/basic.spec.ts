import { test, expect } from '@playwright/test';

test.describe('基本的なチャットインターフェース', () => {
  const mockModels = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Test model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Test model' },
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'claude', description: 'Test model' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'claude', description: 'Test model' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'claude', description: 'Test model' },
  ];

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockModels),
      });
    });
    await page.goto('/');
  });

  test('チャットインターフェースが正しく表示される', async ({ page }) => {
    // ヘッダーの確認
    await expect(page.locator('h1')).toHaveText('AI Chat');

    // メッセージ表示エリアの確認
    await expect(page.locator('.message-list')).toBeVisible();

    // 入力フィールドの確認
    await expect(page.locator('.message-textarea')).toBeVisible();

    // 送信ボタンの確認
    await expect(page.locator('.send-button')).toBeVisible();

    // モデル選択ドロップダウンの確認
    await expect(page.locator('.model-selector')).toBeVisible();
  });

  test('空の入力では送信ボタンが無効化される', async ({ page }) => {
    const sendButton = page.locator('.send-button');

    // 初期状態で無効化されている
    await expect(sendButton).toBeDisabled();

    // テキストを入力すると有効化される
    await page.locator('.message-textarea').fill('テストメッセージ');
    await expect(sendButton).toBeEnabled();

    // テキストを削除すると再び無効化される
    await page.locator('.message-textarea').clear();
    await expect(sendButton).toBeDisabled();
  });

  test('モデルを選択できる', async ({ page }) => {
    const modelSelector = page.locator('.model-selector');

    // モデル選択ドロップダウンが表示される
    await expect(modelSelector).toBeVisible();

    // モデルが読み込まれるまで待つ
    await expect(modelSelector.locator('option')).not.toHaveCount(0);

    // 利用可能なモデルが表示される
    const options = await modelSelector.locator('option').all();
    expect(options.length).toBeGreaterThan(0);

    // モデルを選択できる
    await modelSelector.selectOption({ index: 0 });
    const firstOptionValue = await modelSelector.locator('option').first().getAttribute('value');
    await expect(modelSelector).toHaveValue(firstOptionValue || '');
  });
});
