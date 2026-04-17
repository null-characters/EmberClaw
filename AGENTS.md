# EmberClaw — Agent 上下文

本仓库是 **EmberClaw** 主项目：在 **OpenClaw** 之上叠加 **claw-code-parity（Rust）** 与自研 **skills**，面向 IoT 全栈（Nordic、网关、移动端、Web）。

## 目录

| 路径 | 说明 |
|------|------|
| `openclaw/` | git submodule：OpenClaw 主框架（开发与构建在子目录内进行） |
| `claw-engine/claw-code-parity/` | git submodule：Rust 编程引擎 / CLI |
| `skills/` | 项目自有 skills（IoT 专属 + 通用） |
| `bin/emberclaw.mjs` | CLI 入口：解析 `claw` 引擎路径，实现子命令透传 |
| `package.json` | `bin` 映射 + `build:engine` 脚本 |
| `docs/plan/` | `PROJECT_PLAN.md`、各阶段进度 |
| `AGENTS.md` | 本文件 — agent 上下文（对外只读） |
| `SOUL.md` | 长期记忆与决策记录（可随任务更新） |

## 技能系统

### 结构

每个 skill 放在 `skills/<skill-name>/` 下，至少包含一个 `SKILL.md`。

### Skills 总览

#### 开发工具链（阶段 3）

| Skill | 说明 |
|-------|------|
| `github` | gh CLI — PR、CI、issue、API 查询 |
| `xcode-build` | xcodebuild/xcrun — iOS 构建、签名、模拟器 |
| `android-build` | Gradle/ADB — Android 构建、安装、调试 |
| `nrf-sdk` | west/nrfjprog — nRF52840 固件编译、烧录、调试 |
| `docker-ci` | Docker — CI 容器、交叉编译环境 |

#### IoT 专属

| Skill | 说明 |
|-------|------|
| `nordic-nrf` | Nordic nRF5x/nRF Connect SDK 专家（BLE、功耗、外设） |
| `nordic-mesh` | nRF Mesh 开发（配置、Provisioning、模型） |
| `power-control` | 开关电源控制驱动开发 |
| `rpi-gateway` | 树莓派 Linux 网关部署与调试 |
| `ios-dev` | iOS / SwiftUI 开发技能 |
| `android-dev` | Android / Jetpack Compose 开发技能 |
| `embedded-testing` | 嵌入式测试与 CI |

### 使用方式

Agent 在执行任务前扫描 `skills/` 目录，按需加载 `SKILL.md` 内容指导操作。

## CLI 用法

```bash
# REPL（透传至 claw）
emberclaw

# 构建引擎
npm run build:engine

# Worktree 管理
emberclaw worktree list|add|remove

# 自动 commit + 可选 push
emberclaw commit-push -m "msg" [--push] [--use-github-token]
```

## 本机 OpenClaw 配置

- 用户级配置：`~/.openclaw/openclaw.json`（含模型 API，**勿提交仓库**）。
- 隔离调试：`openclaw --dev …`

## 规划

详见 [docs/plan/PROJECT_PLAN.md](docs/plan/PROJECT_PLAN.md)。
