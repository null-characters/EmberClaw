#!/usr/bin/env bash
set -euo pipefail

# Template: schedule a recurring build verification and announce to WeCom.
#
# This script only creates the cron job. The "build" itself is performed by the
# agent turn, which may require tool permissions (exec/read) depending on your
# Gateway policy.
#
# SAFETY:
# - Keep the command surface area small.
# - Prefer running a dedicated build script with fixed args instead of letting
#   the agent run arbitrary shell.
#
# Suggested flow:
# - Add a fixed build script (example):
#     scripts/automation/build-and-summarize.sh
# - Then instruct the agent to run THAT script and summarize the output.
#
# Requirements:
# - Gateway running.
# - WeCom configured.

OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

JOB_NAME="${JOB_NAME:-android-build-verify}"
AGENT_ID="${AGENT_ID:-main}"
MODEL="${MODEL:-}" # Optional override, e.g. openai-compatible/kimi-k-2-5

WECOM_TO="${WECOM_TO:-fengbing}"

# Every duration, e.g. 2h / 30m
EVERY="${EVERY:-2h}"
TZ="${TZ:-Asia/Shanghai}"

# Absolute path to a fixed script you control
BUILD_SCRIPT="${BUILD_SCRIPT:-/Users/fengbing/git_prj/SmartEmergencyMesh/scripts/automation/build-and-summarize.sh}"

MESSAGE="$(
  cat <<'EOF'
请执行一次“构建验证”并给出结论（SUCCESS/FAILED）与下一步建议。

约束：
- 只允许执行我提供的固定脚本路径，不要运行其它命令。
- 输出先给 5 行摘要，再给关键错误片段（如有），最后给建议命令。

固定脚本路径：
EOF
)"
MESSAGE="${MESSAGE}
${BUILD_SCRIPT}
"

ARGS=(cron add
  --name "$JOB_NAME"
  --agent "$AGENT_ID"
  --every "$EVERY"
  --tz "$TZ"
  --message "$MESSAGE"
  --announce
  --channel wecom
  --to "$WECOM_TO"
  --expect-final
  --timeout-seconds 900
)

if [[ -n "$MODEL" ]]; then
  ARGS+=(--model "$MODEL")
fi

exec "$OPENCLAW_BIN" "${ARGS[@]}"

