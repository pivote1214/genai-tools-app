# 基本的な原則

- ユーザーとの会話は必ず日本語で行うこと
- 不明点がある場合は、必ずユーザーへ質問を行うこと

# Python ルール

## コーディングスタイル

### 基本方針

- **PEP 8** に準拠する
- すべての関数シグネチャに**型アノテーション**を付与する
- 戻り値の型も必ず明示する（`-> None` を含む）

```python
# Good
def get_user(user_id: int) -> User | None:
    ...

# Bad — 型アノテーションがない
def get_user(user_id):
    ...
```

### イミュータビリティ

変更不要なデータにはイミュータブルなデータ構造を優先する。

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

- ミュータブルな `@dataclass` は、状態の変更が明確に必要な場合のみ使用する
- `dict` よりも `dataclass` や `NamedTuple` を優先する

### フォーマット・リンター

- **black**: コードフォーマット
- **isort**: import の整列
- **ruff**: リンティング

---

## uv（パッケージ管理）

パッケージ管理には **uv** を使用する。

### 基本ワークフロー

```bash
# 1. 新規プロジェクト作成
uv init

# 2. Python バージョンを指定
uv python install <version-name>
uv python pin <version-name>

# 3. 仮想環境を作成・同期
uv venv
uv sync

# 4. 依存関係を追加 / 削除
uv add requests
uv add --dev pytest ruff    # 開発環境のみ
uv remove requests

# 5. コマンドの実行
uv run python -V
uv run pytest
```

### ルール

- 依存関係の追加・削除は必ず `uv add` / `uv remove` を使う（`pyproject.toml` を手動編集しない）
- スクリプトやテストの実行は `uv run` 経由で行い、仮想環境の直接 activate は避ける
- `uv.lock` はリポジトリにコミットする

---

## テスト

### フレームワーク

テストフレームワークには **pytest** を使用する。

### カバレッジ

```bash
uv run pytest --cov=src --cov-report=term-missing
```

### テストの分類

`pytest.mark` でテストを分類する。

```python
import pytest

@pytest.mark.unit
def test_calculate_total() -> None:
    ...

@pytest.mark.integration
def test_database_connection() -> None:
    ...
```

# Git ルール

## コミットメッセージ

Conventional Commits に従う。メッセージは日本語で書く。

### フォーマット

```
<type>(<scope>): <subject>

<body>
```

- **type**: 必須。以下のいずれかを使用する
  - `feat` — 新機能の追加
  - `fix` — バグ修正
  - `docs` — ドキュメントのみの変更
  - `style` — コードの意味に影響しない変更（空白、フォーマット等）
  - `refactor` — バグ修正でも機能追加でもないコード変更
  - `perf` — パフォーマンス改善
  - `test` — テストの追加・修正
  - `ci` — CI設定やスクリプトの変更
  - `chore` — ビルドプロセスや補助ツールの変更
- **scope**: 任意。変更対象のモジュールや機能名（例: `auth`, `api`, `ui`）
- **subject**: 必須。変更内容を簡潔に要約する。体言止めまたは動詞終わりで統一する
- **body**: 任意。変更の理由や背景を補足する。1行空けて記述する

---

## ブランチ命名規則

### フォーマット

```
<type>/<short-description>
```

- **type**: 以下のいずれかを使用する
  - `feature/` — 新機能
  - `fix/` — バグ修正
  - `hotfix/` — 緊急修正
  - `docs/` — ドキュメント
  - `refactor/` — リファクタリング
  - `chore/` — 雑務・メンテナンス
- **short-description**: ケバブケース（`kebab-case`）で簡潔に内容を表す

---

## プルリクエスト

### タイトル

コミットメッセージと同じ Conventional Commits 形式を使う。

### 本文テンプレート

以下の構成で記述する。

```
## 概要
<!-- この PR で何を変更したか -->

## 変更理由
<!-- なぜこの変更が必要か -->

## 変更内容
<!-- 主な変更点を箇条書きで -->

## テスト
<!-- どのようにテストしたか -->

## 備考
<!-- レビュアーに伝えたいこと（任意） -->
```
