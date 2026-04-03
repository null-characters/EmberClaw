# EmberClaw 🦊

> 24/7 IoT 系统开发 CLI 编程 Agent

**EmberClaw** 是一个完全私有、可长期迭代的 CLI 编程 Agent，专注于 IoT 系统全栈开发。

## 核心能力

- 📡 **Nordic nRF 固件 + nRF Mesh 开发**
- ⚡ **开关电源控制驱动**
- 🍓 **树莓派 Linux 网关部署与调试**
- 📱 **iOS / Android App 开发**
- 🌐 **Web 全栈开发**
- 🔄 **端到端集成测试与部署**

## 技术栈

- **主框架**: OpenClaw（`openclaw/` submodule）
- **编程引擎**: claw-code-parity / `claw`（Rust，`claw-engine/claw-code-parity/`）
- **入口 CLI**: `emberclaw`（本仓库根目录，包装 `claw` 并扩展 worktree / commit-push）
- **语言**: TypeScript + Rust
- **工具层**: Serial MCP / SSH MCP / Docker MCP（后续阶段）

## 快速开始

```bash
git clone --recurse-submodules https://github.com/null-characters/EmberClaw.git
cd EmberClaw

# 构建 Rust 引擎（生成 claw 二进制）
npm run build:engine

# 可选：全局或 PATH 使用 emberclaw
npm link   # 或: export PATH="$PWD/node_modules/.bin:$PATH" 并在目录 npm install

# 查看引擎路径与 claw 帮助
emberclaw engine-path
emberclaw --help

# 交互式编程 REPL（默认，无子命令时等同 claw）
emberclaw

# Git worktree
emberclaw worktree list

# 可选：暂存、提交、推送（推送需已配置 remote；PAT 见 commit-push --help）
emberclaw commit-push -m "chore: sync" --push
```

**环境变量**

- `EMBERCLAW_CLAW_BIN` 或 `CLAW_BIN`：显式指定 `claw` 可执行文件路径（覆盖自动探测）。
- 模型与鉴权仍按 claw-code-parity / Anthropic 侧配置（如 `ANTHROPIC_API_KEY`），与 OpenClaw 的 `~/.openclaw/openclaw.json` 相互独立，除非你自行统一。

## 文档

- [项目规划](docs/plan/PROJECT_PLAN.md)
- [阶段 0 进度](docs/plan/PHASE_0.md) · [阶段 1 进度](docs/plan/PHASE_1.md)

## 项目状态

**阶段 1 进行中** — `emberclaw` 可启动，集成 `claw` 为 coding engine，含 worktree / commit-push 骨架。

## License

MIT
