# 阶段 1：基础骨架 — 进度记录

> 对应总规划：[PROJECT_PLAN.md](./PROJECT_PLAN.md)「阶段 1」  
> 上一阶段：[PHASE_0.md](./PHASE_0.md)  
> 最后更新：**2026-04-03**

---

## 目标

集成 **claw-code-parity（Rust）** 作为 coding engine，形成可启动的 **EmberClaw** CLI 骨架：基本 REPL、git worktree、自动 commit/push（可选）、参数解析。

---

## 任务清单

| 任务 | 状态 | 说明 |
|------|------|------|
| 集成 claw-code-parity Rust 为 coding engine | ✅ | 通过 `emberclaw` 解析 `claw` 路径：`target/release/claw` → `target/debug/claw` → 环境变量 `EMBERCLAW_CLAW_BIN` / `CLAW_BIN`；`emberclaw engine-path` 可打印最终路径 |
| 基本 REPL 交互 | ✅ | 无子命令时原样转发至 `claw`；`claw` 空参默认为交互 REPL |
| git worktree 支持 | ✅ | `emberclaw worktree list|add|remove` → 当前目录下 `git worktree …` |
| 自动 commit / push（PAT） | ✅ | `emberclaw commit-push [-m msg] [--push] [--use-github-token]`；token 读取 `GITHUB_TOKEN` / `GH_TOKEN`，仅对 `https://github.com/` 的 origin 注入 x-access-token（详见 `--help`） |
| 基本命令行参数解析 | ✅ | Node `bin/emberclaw.mjs`；专有子命令优先，其余透传 `claw` |
| 输出：`emberclaw` 可启动 | ✅ | 根目录 `package.json` `bin` → `npm link` 或 `npx` / `node bin/emberclaw.mjs`；`npm run build:engine` 构建 `rusty-claude-cli` |

---

## 引擎契约（摘要）

| 项 | 约定 |
|----|------|
| 包 / 二进制 | workspace 包 `rusty-claude-cli`，可执行文件名 **`claw`** |
| 构建 | `cargo build --release -p rusty-claude-cli --manifest-path claw-engine/claw-code-parity/rust/Cargo.toml` |
| 产物路径 | `claw-engine/claw-code-parity/rust/target/release/claw`（或 debug） |
| 行为 | CLI 语义以 upstream `claw` 为准；`emberclaw` 不修改引擎，仅包装与扩展 |

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-04-02 | 建文档，阶段 1 启动 |
| 0.2 | 2026-04-03 | 落地 `emberclaw`（`package.json` + `bin/emberclaw.mjs`）、`build:engine`、PHASE_1 任务勾选 |
