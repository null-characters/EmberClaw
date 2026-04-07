# EmberClaw API 参考

> 版本: 0.2.0 | 更新日期: 2026-04-07

---

## 目录

1. [CLI 命令](#cli-命令)
2. [配置文件格式](#配置文件格式)
3. [HTTP API](#http-api)
4. [TypeScript API](#typescript-api)
5. [环境变量](#环境变量)

---

## CLI 命令

### emberclaw

主入口命令。

```bash
emberclaw [command] [options]
```

#### 基本选项

| 选项 | 说明 |
|------|------|
| `--help`, `-h` | 显示帮助信息 |
| `--version`, `-v` | 显示版本号 |

#### 子命令

##### `emberclaw` (无参数)

启动交互式 REPL 会话。

```bash
emberclaw
```

##### `emberclaw daemon`

启动守护进程模式。

```bash
emberclaw daemon
```

**环境变量**：
- `HEALTH_PORT`: 健康检查端口（默认 9876）

##### `emberclaw engine-path`

显示 claw 引擎二进制文件路径。

```bash
emberclaw engine-path
# 输出: /path/to/claw
```

##### `emberclaw worktree`

Git worktree 管理。

```bash
# 列出所有 worktree
emberclaw worktree list

# 添加新 worktree
emberclaw worktree add <name> [branch]

# 删除 worktree
emberclaw worktree remove <name>
```

##### `emberclaw commit-push`

Git 提交并推送。

```bash
emberclaw commit-push -m "commit message" [options]
```

| 选项 | 说明 |
|------|------|
| `-m, --message <msg>` | 提交信息（必需） |
| `--push` | 提交后推送 |
| `--use-github-token` | 使用 GitHub Token 推送 |

---

## 配置文件格式

### Agent 配置 (JSONC)

路径: `config/agents/<agent-name>.jsonc`

```jsonc
{
  // Agent 唯一标识符
  "id": "embedded",
  
  // 显示名称
  "name": "Embedded Agent",
  
  // 加载的技能列表
  "skills": ["nordic-nrf", "nordic-mesh", "power-control"],
  
  // 子 Agent 配置
  "subagents": {
    // 允许 spawn 的子 Agent（leaf agent 为空数组）
    "allowAgents": []
  },
  
  // 沙箱配置
  "sandbox": {
    // 模式: "workspace" | "strict" | "none"
    "mode": "workspace",
    // 允许访问的路径
    "allowedPaths": ["./firmware", "./boards"]
  },
  
  // 默认思考级别: "low" | "medium" | "high"
  "thinkingDefault": "medium",
  
  // 元数据（可选）
  "_meta": {
    "domain": "embedded",
    "depth": 1,
    "version": "0.1.0"
  }
}
```

### 主配置 (emberclaw.jsonc)

```jsonc
{
  "agents": {
    // 全局默认配置
    "defaults": {
      "subagents": {
        "maxSpawnDepth": 2,    // 最大 spawn 深度
        "maxConcurrent": 4,    // 最大并发数
        "maxChildrenPerAgent": 4
      },
      "thinkingDefault": "medium",
      "workspace": "."
    },
    
    // Agent 列表
    "list": [
      {
        "id": "emberclaw-main",
        "name": "EmberClaw Orchestrator",
        "default": true,
        "skills": ["github", "docker-ci"],
        "subagents": {
          "allowAgents": ["embedded", "gateway", "app", "web"]
        }
      }
      // ... 其他 agents
    ]
  },
  
  // 技能配置
  "skills": {
    "directory": "./skills",
    "autoload": true
  },
  
  // 会话配置
  "session": {
    "scope": "agent"
  }
}
```

### 日志配置

在代码中配置：

```typescript
const logger = new Logger({
  level: 'info',           // 'error' | 'warn' | 'info' | 'debug'
  outputDir: '.emberclaw/logs',
  maxFileSize: 10485760,   // 10MB
  maxFiles: 5,
  console: true
});
```

---

## HTTP API

### 端点概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康状态 |
| GET | `/metrics` | 系统指标 |
| GET | `/logs` | 最近日志 |
| GET | `/alerts` | 告警历史 |

### GET /health

返回系统健康状态。

**响应** (200 OK / 503 Service Unavailable):

```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "0.2.0",
  "startedAt": "2026-04-07T00:00:00.000Z",
  "agents": {
    "embedded": {
      "status": "idle",
      "lastActivity": "2026-04-07T01:00:00.000Z"
    },
    "gateway": { "status": "idle" },
    "app": { "status": "running", "currentTask": "build-ios" },
    "web": { "status": "disabled" }
  },
  "lastTask": {
    "id": "task-123",
    "completedAt": "2026-04-07T01:00:00.000Z",
    "status": "success"
  },
  "system": {
    "cpuUsage": 25.5,
    "memoryUsage": 60.2,
    "diskUsage": 45.0
  }
}
```

**状态说明**：
- `healthy`: 所有服务正常
- `degraded`: 部分服务异常或资源紧张
- `unhealthy`: 服务不可用

### GET /metrics

返回系统指标。

**响应**:

```json
{
  "system": {
    "cpu": 25.5,
    "memory": 60.2,
    "disk": 45.0
  },
  "tasks": {
    "total": 100,
    "succeeded": 95,
    "failed": 5
  },
  "uptime": 3600,
  "timestamp": "2026-04-07T01:00:00.000Z"
}
```

### GET /logs

返回最近 50 条日志。

**响应**:

```json
{
  "logs": [
    {
      "ts": "2026-04-07T01:00:00.000Z",
      "level": "info",
      "msg": "Task completed",
      "taskId": "task-123"
    }
  ]
}
```

### GET /alerts

返回告警历史。

**响应**:

```json
{
  "alerts": [
    {
      "type": "memory",
      "severity": "warning",
      "message": "Memory usage is high: 85.5%",
      "value": 85.5,
      "threshold": 80,
      "timestamp": "2026-04-07T01:00:00.000Z"
    }
  ]
}
```

---

## TypeScript API

### Orchestrator

#### EmberClawOrchestrator

```typescript
import { EmberClawOrchestrator } from './src/orchestrator/index.js';

const orchestrator = new EmberClawOrchestrator();

// 执行任务
const result = await orchestrator.execute([
  { id: 'task-1', description: '编译 nRF52840 固件' },
  { id: 'task-2', description: '构建 iOS App' }
]);
```

#### 任务路由

```typescript
import { inferTaskType, mapTaskToAgent } from './src/orchestrator/agent-dispatch.js';

const taskType = inferTaskType('编译固件');  // 'compile'
const agent = mapTaskToAgent(taskType);       // 'embedded'
```

### Daemon

#### Logger

```typescript
import { Logger, getLogger } from './src/daemon/index.js';

// 全局单例
const logger = getLogger({ level: 'debug' });

// 或创建新实例
const customLogger = new Logger({
  level: 'info',
  outputDir: '/custom/path',
  console: false
});

logger.info('Message', { key: 'value' });
logger.error('Error occurred', { error: err.message });
```

#### Monitor

```typescript
import { Monitor } from './src/daemon/index.js';

const monitor = new Monitor(logger, {
  checkInterval: 60000,
  thresholds: { cpu: 80, memory: 90, disk: 95 }
});

monitor.start();
monitor.updateAgentStatus('embedded', 'running', 'task-123');
monitor.recordTaskResult(true);

const metrics = await monitor.getSystemMetrics();
```

#### HealthServer

```typescript
import { HealthServer } from './src/daemon/index.js';

const healthServer = new HealthServer(logger, monitor, { port: 9876 });
await healthServer.start();

// 记录任务完成
healthServer.recordTaskCompletion('task-123', true);

await healthServer.stop();
```

#### BackupManager

```typescript
import { BackupManager } from './src/daemon/index.js';

const backup = new BackupManager(logger, '.', {
  enabled: true,
  backupDir: '.emberclaw/backups'
});

// 创建备份
const manifest = await backup.createBackup('incremental');

// 列出备份
const backups = backup.listBackups();

// 恢复备份
await backup.restore('incremental-2026-04-07...');
```

#### EmberClawDaemon

```typescript
import { EmberClawDaemon } from './src/daemon/index.js';

const daemon = new EmberClawDaemon({
  healthPort: 9876,
  logger: { level: 'info' },
  backup: { enabled: true }
});

await daemon.start();

// 更新状态
daemon.updateAgentStatus('embedded', 'running', 'task-123');
daemon.recordTaskCompletion('task-123', true);

// 创建备份
await daemon.createBackup('full');

await daemon.stop();
```

---

## 环境变量

### 必需

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API 密钥 |

### 可选

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `GITHUB_TOKEN` | GitHub 访问令牌 | - |
| `HEALTH_PORT` | 健康检查端口 | 9876 |
| `NODE_ENV` | 运行环境 | development |
| `EMBERCLAW_CLAW_BIN` | claw 引擎路径 | 自动检测 |
| `CLAW_BIN` | claw 引擎路径（备选） | 自动检测 |

### 引擎路径解析顺序

1. `EMBERCLAW_CLAW_BIN` 环境变量
2. `CLAW_BIN` 环境变量
3. `target/release/claw`
4. `target/debug/claw`

---

## 类型定义

完整类型定义见：
- `src/orchestrator/types.ts`
- `src/daemon/types.ts`

---

*© 2026 EmberClaw Team*
