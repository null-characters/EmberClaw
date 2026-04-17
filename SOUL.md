# EmberClaw — 长期记忆

> 本文件记录项目关键决策、经验教训、常见问题，供 agent 在后续任务中快速恢复上下文。

---

## 核心决策记录

### 架构选择：薄包装而非 fork

`emberclaw` 做薄 Node 包装层，不 fork `claw` 引擎代码。子模块 `claw-code-parity` 上游对齐，自定义逻辑放在包装层。理由：降低维护负担，跟随上游更新。

### 引擎解析顺序

`EMBERCLAW_CLAW_BIN` / `CLAW_BIN` 环境变量 → `target/release/claw` → `target/debug/claw`。优先级高到低，灵活覆盖。

### GitHub Token 注入

`--use-github-token` 仅对 `https://github.com/` 开头的 origin 注入 token（`x-access-token` 方式），避免在非标准场景误注入。

### 技能系统设计

每个 skill 放在 `skills/<name>/SKILL.md`，agent 按需加载。IoT 专属 skills 为项目核心竞争力。

---

## 经验教训

### 已修复的问题

- `resolveClawBinary` 初版错误信息有冗余三元表达式，已简化
- `git push --repo <token-url>` 的 refspec 方案改为 `push <token-url> HEAD:refs/heads/<branch>`，更安全不污染本地 remote

### 待关注

- claw 引擎上游可能有 breaking changes，升级前先 diff CHANGELOG
- SOUL.md 本身也是上下文的一部分，大改动需同步更新

---

## 常用命令备忘

```bash
# 构建引擎（约 50s）
npm run build:engine

# 验证 CLI
node bin/emberclaw.mjs engine-path
node bin/emberclaw.mjs --help

# Worktree 操作
node bin/emberclaw.mjs worktree list
```

---

## 阶段 3 决策

### 三端聚焦，延迟网关工具

阶段 3 聚焦 nRF52840 / iOS / Android 三端开发。Serial MCP、SSH MCP、Database MCP 延迟到阶段 4+（网关开发时再集成），原因：三端当前通过 BLE/USB 调试，无远程设备操作需求，无数据库需求。

### 集成方式：Skill 文档，非 MCP Server

OpenClaw 的 skills 是 SKILL.md 文档 + CLI 工具调用，不是独立 MCP server。agent 通过文档引导使用 xcodebuild、gradlew、west 等系统 CLI。工具层用 mcporter 桥接外部 MCP。

---

## 阶段 4 决策

### 多 Agent 分组：4 领域 agent + 1 orchestrator

分组依据：按 IoT 全栈的独立工作域划分。每个 agent 是 depth-1 leaf（不可再 spawn），通过 OpenClaw `allowAgents` 白名单控制。Orchestrator (depth-0) 负责 Planning -> TDD -> Review -> Deploy 流程编排。

分组：
- **embedded**: 嵌入式固件（nordic-nrf/mesh, power-control, nrf-sdk, embedded-testing）
- **gateway**: 网关 + CI（rpi-gateway, docker-ci, github, embedded-testing）
- **app**: 移动端（ios-dev, android-dev, xcode-build, android-build）
- **web**: 阶段 5 占位

### OpenClaw sub-agent 机制

- `sessions_spawn`：run（一次性）或 session（持久）模式
- push-based 通知：子 agent 完成后自动通知父 agent，无需轮询
- `maxSpawnDepth`：默认 1，阶段 4 设为 2（orchestrator -> agent）
- `allowAgents`：per-agent 白名单，限制可 spawn 的子 agent
- steer 机制：可中断运行中的 sub-agent 并重启

---

## 阶段 5 决策

### 部署策略：Docker 优先，systemd/pm2 备选

Docker 是主要部署方式，支持 ARM64 (树莓派) + AMD64 多架构。systemd 和 pm2 作为备选方案，适用于裸机部署或已有 Node.js 环境的场景。

### 日志系统：JSONL 结构化日志

采用 JSON Lines 格式，便于机器解析和日志聚合工具集成。日志级别：ERROR > WARN > INFO > DEBUG。默认输出 INFO 及以上到文件，支持运行时调整级别。

### 监控与健康检查

- 健康检查暴露 HTTP 端点 `/health`，返回 agent 状态、uptime、最近任务
- 资源监控关注 CPU、内存、磁盘，超阈值时记录日志并可选通知
- 自愈机制：内存超限时自动重启

### 记忆备份策略

- SOUL.md 和配置文件：每日增量备份
- 会话历史：按需备份（可禁用以节省空间）
- 备份目录：`~/.emberclaw/backups/`

### 自动更新

检查 GitHub Releases API 获取新版本，下载后校验 SHA256，无中断替换（停止 -> 替换 -> 启动 -> 健康检查）。失败时自动回滚。

---

*最后更新：2026-04-07 — 阶段 5 启动：生产级部署与运维*
