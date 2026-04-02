#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: 当前目录不是 Git 仓库根目录：$REPO_ROOT" >&2
  exit 1
fi

origin_url="$(git remote get-url origin 2>/dev/null || true)"
if [[ -z "$origin_url" ]]; then
  echo "Error: 未找到名为 'origin' 的远程仓库，请先设置 remote。" >&2
  exit 1
fi

read -s -p "Enter GitHub PAT token (required for HTTPS auth): " TOKEN
echo
if [[ -z "${TOKEN}" ]]; then
  echo "Error: token 不能为空" >&2
  exit 1
fi

# Fetch GitHub username from token (optional fallback to manual input).
LOGIN=""
if command -v curl >/dev/null 2>&1; then
  LOGIN="$(
    curl -fsSL \
      -H "Authorization: Bearer ${TOKEN}" \
      https://api.github.com/user \
      | python3 -c 'import sys, json; print(json.load(sys.stdin)["login"])' 2>/dev/null || true
  )"
fi
if [[ -z "$LOGIN" ]]; then
  read -p "GitHub username (for basic auth): " LOGIN
fi

if [[ -z "$LOGIN" ]]; then
  echo "Error: GitHub username 不能为空" >&2
  exit 1
fi

echo "Note: 脚本会使用 'git credential.helper store'，将凭据以明文写入 ~/.git-credentials。"
read -p "Proceed? [y/N]: " yn
case "${yn}" in
  y|Y) ;;
  *) echo "Cancelled."; exit 0 ;;
esac

# Store HTTPS credentials for subsequent git operations.
git config --global credential.helper store
printf "protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n" "$LOGIN" "$TOKEN" | git credential approve

echo "Testing remote connectivity..."
# Remote repo may be empty; ls-remote should still succeed if auth is OK.
git ls-remote origin >/dev/null

echo "OK: 已完成 GitHub HTTPS 认证，并可访问 origin。"
echo "origin = $(git remote get-url origin)"
echo "Next (if you want to upload code): git add . && git commit -m \"init\" && git push -u origin main"

