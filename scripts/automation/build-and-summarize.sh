#!/usr/bin/env bash
set -euo pipefail

# Fixed build script for OpenClaw automation.
#
# Goal:
# - Run a deterministic build command in a deterministic working directory.
# - Save full logs to a file.
# - Print a compact summary to stdout (used by the agent / cron announce).
#
# IMPORTANT:
# - Do NOT embed any secrets in this repo. Use env vars or local config.
#
# Usage examples:
#
#   # Dry run (no-op build)
#   WORKDIR="/Users/fengbing/git_prj/ai-agent" BUILD_CMD="true" ./scripts/automation/build-and-summarize.sh
#
#   # Android example (adjust to your repo path)
#   WORKDIR="/path/to/SmartEmergencyMesh" \
#   BUILD_CMD="./gradlew assembleDebug --stacktrace" \
#   ./scripts/automation/build-and-summarize.sh

WORKDIR="${WORKDIR:-/Users/fengbing/git_prj/ai-agent}"
BUILD_CMD="${BUILD_CMD:-true}"

OUT_DIR="${OUT_DIR:-/tmp/emberclaw-automation}"
mkdir -p "$OUT_DIR"

TS="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="$OUT_DIR/build-$TS.log"

STARTED_AT="$(date -Iseconds)"

if [[ ! -d "$WORKDIR" ]]; then
  echo "**执行结果汇总**"
  echo
  echo "| 字段 | 值 |"
  echo "|------|-----|"
  echo "| status | **FAILED** |"
  echo "| rc | 2 |"
  echo "| time | \`$STARTED_AT\` |"
  echo "| workdir | \`$WORKDIR\` |"
  echo "| cmd | \`$BUILD_CMD\` |"
  echo "| log 路径 | \`$LOG_FILE\` |"
  echo
  echo "**错误：** WORKDIR 不存在"
  exit 2
fi

set +e
(
  cd "$WORKDIR"
  echo "[env] uname: $(uname -a)"
  echo "[env] node: $(node -v 2>/dev/null || echo 'n/a')"
  echo "[env] git: $(git --version 2>/dev/null || echo 'n/a')"
  if command -v git >/dev/null 2>&1; then
    echo "[git] rev: $(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
    echo "[git] branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'n/a')"
    git status --porcelain=v1 2>/dev/null | head -50 || true
  fi
  echo "[build] start: $(date -Iseconds)"
  bash -lc "$BUILD_CMD"
  rc=$?
  echo "[build] end: $(date -Iseconds) rc=$rc"
  exit "$rc"
) >"$LOG_FILE" 2>&1
RC=$?
set -e

ENDED_AT="$(date -Iseconds)"

if [[ $RC -eq 0 ]]; then
  STATUS="SUCCESS"
else
  STATUS="FAILED"
fi

echo "**执行结果汇总**"
echo
echo "| 字段 | 值 |"
echo "|------|-----|"
echo "| status | **$STATUS** |"
echo "| rc | $RC |"
echo "| startedAt | \`$STARTED_AT\` |"
echo "| endedAt | \`$ENDED_AT\` |"
echo "| workdir | \`$WORKDIR\` |"
echo "| cmd | \`$BUILD_CMD\` |"
echo "| log 路径 | \`$LOG_FILE\` |"
echo
echo "**log_tail（关键 60 行）：**"
echo '```'
tail -n 60 "$LOG_FILE" || true
echo '```'

if [[ "$STATUS" == "SUCCESS" ]]; then
  echo
  echo "**结论：** 构建验证通过 ✅"
else
  echo
  echo "**结论：** 构建验证失败 ❌"
fi

exit "$RC"

