# EmberClaw — Agent 上下文

本仓库是 **EmberClaw** 主项目：在 **OpenClaw** 之上叠加 **claw-code-parity（Rust）** 与自研 **skills**，面向 IoT 全栈（Nordic、网关、移动端、Web）。

## 目录

| 路径 | 说明 |
|------|------|
| `openclaw/` | git submodule：OpenClaw 主框架（开发与构建在子目录内进行） |
| `claw-engine/claw-code-parity/` | git submodule：Rust 编程引擎 / CLI |
| `skills/` | 项目自有 skills（阶段 1+ 填充） |
| 根目录 `package.json` + `bin/emberclaw.mjs` | `emberclaw` CLI：调用 `claw-engine/.../target/{release,debug}/claw`，可用 `EMBERCLAW_CLAW_BIN` 覆盖 |
| `docs/plan/` | `PROJECT_PLAN.md`、各阶段进度（`PHASE_0.md`、`PHASE_1.md`） |

## 本机 OpenClaw 配置

- 用户级配置：`~/.openclaw/openclaw.json`（含模型 API，**勿提交仓库**）。
- 隔离调试：`openclaw --dev …`

## 规划

详见 [docs/plan/PROJECT_PLAN.md](docs/plan/PROJECT_PLAN.md)。
