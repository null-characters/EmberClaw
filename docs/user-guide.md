# EmberClaw 用户使用手册

> 版本: 0.2.0 | 更新日期: 2026-04-07

---

## 目录

1. [简介](#简介)
2. [安装](#安装)
3. [快速开始](#快速开始)
4. [配置](#配置)
5. [命令参考](#命令参考)
6. [部署选项](#部署选项)
7. [监控与健康检查](#监控与健康检查)
8. [故障排除](#故障排除)

---

## 简介

**EmberClaw** 是一个面向 IoT 全栈开发的 CLI 编程 Agent，支持：

- 📡 Nordic nRF 固件 + nRF Mesh 开发
- ⚡ 开关电源控制驱动
- 🍓 树莓派 Linux 网关部署
- 📱 iOS / Android App 开发
- 🌐 Web 前端 + 后端

### 架构概览

```
EmberClaw
├── orchestrator (编排器)
│   ├── embedded agent (嵌入式)
│   ├── gateway agent (网关)
│   ├── app agent (移动端)
│   └── web agent (Web)
└── daemon (守护进程)
    ├── logger (日志)
    ├── monitor (监控)
    ├── health (健康检查)
    └── backup (备份)
```

---

## 安装

### 系统要求

- Node.js 20+
- Git
- Rust 1.77+ (用于编译引擎)

### 方式一：从源码安装

```bash
# 克隆仓库
git clone https://github.com/null-characters/EmberClaw.git
cd EmberClaw

# 安装依赖
npm install

# 编译 Rust 引擎（首次运行，约 50 秒）
npm run build:engine

# 验证安装
node bin/emberclaw.mjs --help
```

### 方式二：Docker 安装

```bash
# 构建镜像
docker build -t emberclaw:latest .

# 运行容器
docker run -d \
  --name emberclaw \
  -p 9876:9876 \
  -e ANTHROPIC_API_KEY=your-key \
  emberclaw:latest
```

### 方式三：Docker Compose

```bash
# 编辑 .env 文件添加 API 密钥
echo "ANTHROPIC_API_KEY=your-key" > .env

# 启动服务
docker-compose up -d
```

---

## 快速开始

### 启动交互式 REPL

```bash
# 基本启动
emberclaw

# 或使用 node 直接运行
node bin/emberclaw.mjs
```

### 启动守护进程模式

```bash
# 前台运行
emberclaw daemon

# 后台运行（使用 pm2）
pm2 start ecosystem.config.cjs
```

### 示例对话

```
你: 编译 nRF52840 固件并烧录到开发板

EmberClaw: 我将协调嵌入式 Agent 完成此任务：
1. [embedded] 正在编译固件...
2. [embedded] 编译成功，开始烧录...
3. [embedded] 烧录完成 ✓
```

---

## 配置

### 模型配置

在 `~/.openclaw/openclaw.json` 中配置 LLM API：

```json
{
  "model": {
    "provider": "anthropic",
    "apiKey": "your-anthropic-key",
    "model": "claude-sonnet-4-20250514"
  }
}
```

### Agent 配置

主配置文件：`config/agents/emberclaw.jsonc`

```jsonc
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxSpawnDepth": 2,
        "maxConcurrent": 4
      }
    }
  }
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | - |
| `GITHUB_TOKEN` | GitHub 访问令牌 | - |
| `HEALTH_PORT` | 健康检查端口 | 9876 |
| `NODE_ENV` | 运行环境 | development |
| `EMBERCLAW_CLAW_BIN` | claw 引擎路径 | 自动检测 |

---

## 命令参考

### 基本命令

```bash
# 显示帮助
emberclaw --help

# 显示版本
emberclaw --version

# 显示引擎路径
emberclaw engine-path
```

### Worktree 管理

```bash
# 列出所有 worktree
emberclaw worktree list

# 创建新 worktree
emberclaw worktree add <name> [branch]

# 删除 worktree
emberclaw worktree remove <name>
```

### Git 操作

```bash
# 提交并推送
emberclaw commit-push -m "feat: add feature X"

# 使用 GitHub Token 推送
emberclaw commit-push -m "message" --push --use-github-token
```

### 守护进程

```bash
# 启动守护进程
emberclaw daemon

# 查看状态（通过 HTTP）
curl http://localhost:9876/health
```

---

## 部署选项

### 选项 1: Docker（推荐）

```bash
# 生产部署
docker-compose up -d

# 查看日志
docker-compose logs -f emberclaw

# 停止服务
docker-compose down
```

### 选项 2: systemd (Linux)

```bash
# 复制服务文件
sudo cp deploy/emberclaw.service /etc/systemd/system/

# 创建用户
sudo useradd -r -s /bin/false emberclaw

# 安装到 /opt/emberclaw
sudo mkdir -p /opt/emberclaw
sudo cp -r . /opt/emberclaw/
sudo chown -R emberclaw:emberclaw /opt/emberclaw

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable emberclaw
sudo systemctl start emberclaw

# 查看状态
sudo systemctl status emberclaw
```

### 选项 3: pm2

```bash
# 安装 pm2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.cjs

# 开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs emberclaw
```

---

## 监控与健康检查

### 健康检查端点

```bash
# 基本健康检查
curl http://localhost:9876/health

# 输出示例
{
  "status": "healthy",
  "uptime": 3600,
  "version": "0.2.0",
  "agents": {
    "embedded": { "status": "idle" },
    "gateway": { "status": "idle" },
    "app": { "status": "idle" },
    "web": { "status": "disabled" }
  }
}
```

### 其他端点

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康状态 |
| `GET /metrics` | 系统指标 |
| `GET /logs` | 最近日志 |
| `GET /alerts` | 告警历史 |

### 日志位置

- **JSONL 日志**: `.emberclaw/logs/emberclaw-YYYY-MM-DD.log`
- **pm2 日志**: `.emberclaw/logs/pm2-*.log`
- **Docker 日志**: `docker-compose logs emberclaw`

---

## 故障排除

### 常见问题

#### 1. 引擎找不到

```
Error: claw binary not found
```

**解决方案**：
```bash
# 重新编译引擎
npm run build:engine

# 或设置环境变量
export EMBERCLAW_CLAW_BIN=/path/to/claw
```

#### 2. API 密钥错误

```
Error: Authentication failed
```

**解决方案**：
检查 `~/.openclaw/openclaw.json` 中的 API 密钥是否正确。

#### 3. 端口占用

```
Error: listen EADDRINUSE :9876
```

**解决方案**：
```bash
# 查找占用进程
lsof -i :9876

# 杀死进程或更改端口
export HEALTH_PORT=9877
```

#### 4. 内存不足

**解决方案**：
- 增加系统内存
- 设置内存限制：`max_memory_restart: '1G'`（pm2）
- 使用 Docker 内存限制

### 获取帮助

1. 查看日志：`.emberclaw/logs/`
2. 检查健康状态：`curl localhost:9876/health`
3. GitHub Issues: https://github.com/null-characters/EmberClaw/issues

---

## 下一步

- [开发者文档](developer-guide.md) - 扩展和贡献指南
- [API 文档](api-reference.md) - 详细 API 参考
- [AGENTS.md](../AGENTS.md) - Agent 上下文配置
- [SOUL.md](../SOUL.md) - 项目决策记录

---

*© 2026 EmberClaw Team*
