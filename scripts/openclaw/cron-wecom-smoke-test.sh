#!/usr/bin/env bash
set -euo pipefail

# Purpose:
# - Create a one-shot OpenClaw cron job that runs an agent turn and announces
#   the final summary to a WeCom (企业微信) user.
#
# Requirements:
# - Gateway is running: `openclaw gateway run` (or installed service)
# - WeCom channel configured under channels.wecom (botId/secret/enabled)
#
# Notes:
# - Do NOT store botId/secret in this repo. Keep them in ~/.openclaw/openclaw.json
#   (or OPENCLAW_CONFIG_PATH).

OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

JOB_NAME="${JOB_NAME:-wecom-smoke-test}"
AGENT_ID="${AGENT_ID:-main}"

# WeCom recipient userId, e.g. "fengbing"
WECOM_TO="${WECOM_TO:-fengbing}"

# Run once after N seconds
AT_AFTER="${AT_AFTER:-15s}"

MESSAGE="${MESSAGE:-企业微信自动化冒烟测试：请回复“收到”}"

exec "$OPENCLAW_BIN" cron add \
  --name "$JOB_NAME" \
  --agent "$AGENT_ID" \
  --at "$AT_AFTER" \
  --message "$MESSAGE" \
  --announce \
  --channel wecom \
  --to "$WECOM_TO" \
  --expect-final \
  --timeout-seconds 60 \
  --delete-after-run \
  --json

