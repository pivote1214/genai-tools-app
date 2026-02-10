#!/bin/bash
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

(cd backend && python -m uvicorn main:app --reload 2>&1 | sed "s/^/$(printf " ${RED}[BACK]${NC} ")/") &
sleep 5
(cd frontend && npm run dev 2>&1 | sed "s/^/$(printf "${BLUE}[FRONT]${NC} ")/") &
wait