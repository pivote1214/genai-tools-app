SHELL := /bin/bash
PID_FILE := .dev-pids

.PHONY: check-env dev dev-backend dev-frontend stop

check-env:
	@command -v uv >/dev/null 2>&1 || { echo "Error: uv が見つかりません。インストールしてください。"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "Error: npm が見つかりません。インストールしてください。"; exit 1; }
	@test -f backend/.env || { echo "Error: backend/.env がありません。backend/.env.example から作成してください。"; exit 1; }
	@test -f frontend/.env || { echo "Error: frontend/.env がありません。frontend/.env.example から作成してください。"; exit 1; }

dev: check-env
	@echo "バックエンドとフロントエンドを起動します (Ctrl+C で停止)"
	@set -euo pipefail; \
	trap 'status=$$?; \
		if [ -n "$${BACKEND_PID:-}" ] && kill -0 "$$BACKEND_PID" 2>/dev/null; then kill "$$BACKEND_PID" 2>/dev/null || true; fi; \
		if [ -n "$${FRONTEND_PID:-}" ] && kill -0 "$$FRONTEND_PID" 2>/dev/null; then kill "$$FRONTEND_PID" 2>/dev/null || true; fi; \
		wait 2>/dev/null || true; \
		rm -f "$(PID_FILE)"; \
		exit $$status' INT TERM EXIT; \
	( cd backend && uv run uvicorn main:app --reload 2>&1 | sed 's/^/[backend] /' ) & BACKEND_PID=$$!; \
	( cd frontend && npm run dev 2>&1 | sed 's/^/[frontend] /' ) & FRONTEND_PID=$$!; \
	printf '%s\n%s\n' "$$BACKEND_PID" "$$FRONTEND_PID" > "$(PID_FILE)"; \
	while kill -0 "$$BACKEND_PID" 2>/dev/null && kill -0 "$$FRONTEND_PID" 2>/dev/null; do sleep 1; done; \
	BACKEND_STATUS=0; FRONTEND_STATUS=0; \
	if ! kill -0 "$$BACKEND_PID" 2>/dev/null; then wait "$$BACKEND_PID" || BACKEND_STATUS=$$?; fi; \
	if ! kill -0 "$$FRONTEND_PID" 2>/dev/null; then wait "$$FRONTEND_PID" || FRONTEND_STATUS=$$?; fi; \
	if [ "$$BACKEND_STATUS" -ne 0 ]; then echo "[dev] backend が異常終了しました (status=$$BACKEND_STATUS)"; fi; \
	if [ "$$FRONTEND_STATUS" -ne 0 ]; then echo "[dev] frontend が異常終了しました (status=$$FRONTEND_STATUS)"; fi; \
	if [ "$$BACKEND_STATUS" -ne 0 ] || [ "$$FRONTEND_STATUS" -ne 0 ]; then exit 1; fi

dev-backend: check-env
	@cd backend && uv run uvicorn main:app --reload

dev-frontend: check-env
	@cd frontend && npm run dev

stop:
	@set -euo pipefail; \
	if [ ! -f "$(PID_FILE)" ]; then \
		echo "停止対象が見つかりません ($(PID_FILE) がありません)"; \
		exit 0; \
	fi; \
	STOPPED=0; \
	while IFS= read -r pid; do \
		if [ -n "$$pid" ] && kill -0 "$$pid" 2>/dev/null; then \
			kill "$$pid" 2>/dev/null || true; \
			echo "停止しました: PID=$$pid"; \
			STOPPED=1; \
		fi; \
	done < "$(PID_FILE)"; \
	rm -f "$(PID_FILE)"; \
	if [ "$$STOPPED" -eq 0 ]; then \
		echo "停止対象のプロセスは既に終了しています"; \
	fi
