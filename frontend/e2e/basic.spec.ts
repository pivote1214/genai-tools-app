import { test, expect } from '@playwright/test';

test.describe('基本的なチャットインターフェース', () => {
  test.beforeEach(async ({ page }) => {
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

    // 利用可能なモデルが表示される
    const options = await modelSelector.locator('option').all();
    expect(options.length).toBeGreaterThan(0);

    // モデルを選択できる
    const firstOption = await modelSelector.locator('option').first().textContent();
    await modelSelector.selectOption({ index: 0 });
    await expect(modelSelector).toHaveValue(await modelSelector.locator('option').first().getAttribute('value') || '');
  });
});
