# 阶段 5：长期维护（生产级部署与运维）

> **启动日期**: 2026-04-07
> **目标**: 实现生产级部署、运维监控与完整文档

---

## 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                     Production Deployment                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Docker    │    │  systemd    │    │    pm2      │         │
│  │  Container  │    │  Service    │    │  Process    │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  EmberClaw Daemon                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
│  │  │ Logger  │  │ Monitor │  │ Health  │  │ Updater │     │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 任务清单

### 5.1 部署方案

- [x] Docker 化（多阶段构建、最小镜像）
- [x] systemd 服务配置（Linux 守护进程）
- [x] pm2 备选方案（Node.js 进程管理）
- [x] 自动更新机制（版本检测 + 无中断更新）

### 5.2 运维监控

- [x] 日志系统（结构化日志 + 日志轮转）
- [x] 监控告警（资源监控 + 异常通知）
- [x] 记忆备份（SOUL.md + 会话历史）
- [x] 健康检查（HTTP 端点 + 自愈机制）

### 5.3 文档

- [x] 用户使用手册（安装、配置、使用）
- [x] 开发者文档（架构、扩展、贡献指南）
- [x] API 文档（CLI 参数、配置选项、输出格式）

---

## 技术细节

### 5.1.1 Docker 化

```dockerfile
# 多阶段构建：Rust 编译 + Node.js 运行时
FROM rust:1.77-slim AS rust-builder
FROM node:20-slim AS final
```

**镜像目标**:
- 基础镜像: `node:20-slim` (~180MB)
- 最终镜像: < 500MB（含 Rust binary + Node.js）
- 支持 ARM64 (树莓派) + AMD64

### 5.1.2 systemd 服务

```ini
[Unit]
Description=EmberClaw IoT Agent
After=network.target

[Service]
Type=simple
User=emberclaw
ExecStart=/usr/local/bin/emberclaw daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 5.1.3 pm2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'emberclaw',
    script: 'bin/emberclaw.mjs',
    args: 'daemon',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 5.1.4 自动更新

```
┌─────────────────────────────────────────────────┐
│              Auto-Update Flow                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Version Check (每 6 小时)                    │
│     └─> GitHub Releases API                     │
│                                                 │
│  2. Download (if newer)                         │
│     └─> 下载新版本到临时目录                      │
│                                                 │
│  3. Verify (校验签名)                            │
│     └─> SHA256 + GPG 签名验证                   │
│                                                 │
│  4. Apply (无中断替换)                           │
│     └─> 停止 -> 替换 -> 启动 -> 健康检查         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5.2.1 日志系统

| 级别 | 用途 | 输出 |
|------|------|------|
| ERROR | 错误与异常 | stderr + 文件 |
| WARN | 警告信息 | 文件 |
| INFO | 一般信息 | 文件 |
| DEBUG | 调试信息 | 文件（按需） |

**日志格式**: JSON Lines (JSONL)
```json
{"ts":"2026-04-07T12:00:00Z","level":"INFO","msg":"Agent spawned","agent":"embedded","task":"compile-firmware"}
```

### 5.2.2 监控告警

| 指标 | 阈值 | 告警方式 |
|------|------|---------|
| CPU | > 80% 持续 5 分钟 | 日志 + 可选 webhook |
| 内存 | > 90% | 日志 + 自动重启 |
| 磁盘 | > 95% | 日志 + 清理旧日志 |
| 任务失败率 | > 10% | 日志 + 可选通知 |

### 5.2.3 记忆备份

```
备份内容:
├── SOUL.md                 # 决策记忆
├── sessions/               # 会话历史（可选）
├── config/                 # 配置快照
└── .emberclaw/state.json   # 运行状态
```

**策略**: 每日增量备份 + 每周全量备份

### 5.2.4 健康检查

```typescript
// GET /health
{
  "status": "healthy",
  "uptime": 86400,
  "version": "0.2.0",
  "agents": {
    "embedded": "idle",
    "gateway": "idle",
    "app": "idle",
    "web": "disabled"
  },
  "lastTask": {
    "id": "task-123",
    "completedAt": "2026-04-07T11:00:00Z",
    "status": "success"
  }
}
```

---

## 输出物

- [x] `Dockerfile` + `docker-compose.yml`
- [x] `deploy/emberclaw.service` (systemd)
- [x] `ecosystem.config.cjs` (pm2)
- [x] `src/daemon/` 模块（日志、监控、健康检查、更新）
- [x] `docs/user-guide.md`
- [x] `docs/developer-guide.md`
- [x] `docs/api-reference.md`

---

## 实现文件

### 部署配置
- `Dockerfile` — 多阶段构建镜像
- `docker-compose.yml` — 容器编排配置
- `deploy/emberclaw.service` — systemd 服务单元
- `ecosystem.config.cjs` — pm2 进程管理配置

### Daemon 模块
- `src/daemon/types.ts` — 类型定义
- `src/daemon/logger.ts` — JSONL 结构化日志
- `src/daemon/monitor.ts` — 系统监控与告警
- `src/daemon/health.ts` — HTTP 健康检查服务
- `src/daemon/backup.ts` — 备份管理器
- `src/daemon/updater.ts` — 自动更新模块
- `src/daemon/index.ts` — 模块入口

### 文档
- `docs/user-guide.md` — 用户使用手册
- `docs/developer-guide.md` — 开发者文档
- `docs/api-reference.md` — API 参考

### 测试
- `tests/daemon.test.ts` — Daemon 模块测试

---

## 依赖关系

```
阶段 4 (Multi-Agent) ──┐
                       ├──> 阶段 5 (Production)
阶段 3 (Tools)     ────┘
```

**前置条件**:
- ✅ 阶段 4 完成（多 Agent 编排可用）
- ✅ 核心功能稳定

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-04-07 | v0.1.0 | 阶段 5 规划：生产级部署与运维设计 |
| 2026-04-07 | v0.2.0 | 阶段 5 完成：所有任务已实现 |
