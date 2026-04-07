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

*最后更新：2026-04-07 — 阶段 3 执行中：5 个开发工具 skill 已创建*
