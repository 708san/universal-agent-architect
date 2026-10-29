#!/usr/bin/env bash
set -euo pipefail
if ! command -v gh >/dev/null 2>&1; then
  echo 'GitHub CLI (gh) が必要です。https://cli.github.com/ を参照してください。' >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo '先に gh auth login を実行してください。' >&2
  exit 1
fi
if [ ! -d .git ]; then git init -b main; fi
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m 'chore: initialize universal agent architect'
fi
# Creation and upload require deliberate invocation of this script.
gh repo create universal-agent-architect --private --source=. --remote=origin --push
