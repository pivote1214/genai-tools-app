# uvの使用

```bash
# 1. 新規プロジェクト作成
uv init

# 2. Pythonバージョンを指定
uv python install <version-name>
uv python pin <version-name>

# 3. 仮想環境を作成・同期
uv venv
uv sync

# 4. 依存関係を追加 / 削除
uv add requests
uv add --dev pytest ruff # 開発環境のみ
uv remove requests

# 5. コマンドの実行方法
uv run python -V
uv run pytest
```

# そのほかの制約
- ユーザーとの会話は日本語で行うこと
