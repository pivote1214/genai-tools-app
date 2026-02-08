# Python

## Coding Style

### Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

### Immutability

Prefer immutable data structures:

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

### Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

### Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.

## uv

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

## Testing

### Framework

Use **pytest** as the testing framework.

### Coverage

```bash
uv pytest --cov=src --cov-report=term-missing
```

### Test Organization

Use `pytest.mark` for test categorization:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```
