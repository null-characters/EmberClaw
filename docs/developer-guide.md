# EmberClaw 开发者文档

> 版本: 0.2.0 | 更新日期: 2026-04-07

---

## 目录

1. [项目结构](#项目结构)
2. [开发环境设置](#开发环境设置)
3. [架构概览](#架构概览)
4. [模块说明](#模块说明)
5. [扩展指南](#扩展指南)
6. [测试](#测试)
7. [贡献指南](#贡献指南)

---

## 项目结构

```
emberclaw/
├── bin/
│   └── emberclaw.mjs       # CLI 入口
├── config/
│   └── agents/             # Agent 配置
│       ├── emberclaw.jsonc # 主配置
│       ├── embedded.jsonc  # 嵌入式 Agent
│       ├── gateway.jsonc   # 网关 Agent
│       ├── app.jsonc       # 移动端 Agent
│       └── web.jsonc       # Web Agent
├── src/
│   ├── orchestrator/       # 多 Agent 编排
│   │   ├── types.ts
│   │   ├── agent-dispatch.ts
│   │   ├── workflow.ts
│   │   ├── communication.ts
│   │   └── index.ts
│   └── daemon/             # 守护进程
│       ├── types.ts
│       ├── logger.ts
│       ├── monitor.ts
│       ├── health.ts
│       ├── backup.ts
│       ├── updater.ts
│       └── index.ts
├── skills/                 # 技能定义
│   ├── nordic-nrf/
│   ├── ios-dev/
│   └── ...
├── tests/
│   ├── orchestrator.test.ts
│   └── daemon.test.ts
├── docs/
│   ├── plan/               # 阶段规划
│   ├── user-guide.md
│   ├── developer-guide.md
│   └── api-reference.md
├── deploy/
│   └── emberclaw.service   # systemd 配置
├── AGENTS.md               # Agent 上下文
├── SOUL.md                 # 项目记忆
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs    # pm2 配置
├── package.json
└── tsconfig.json
```

---

## 开发环境设置

### 前置条件

- Node.js 20+
- Rust 1.77+
- Git
- TypeScript 5.4+

### 初始化开发环境

```bash
# 克隆仓库（含子模块）
git clone --recursive https://github.com/null-characters/EmberClaw.git
cd EmberClaw

# 安装依赖
npm install

# 编译 Rust 引擎
npm run build:engine

# 类型检查
npm run typecheck

# 运行测试
npm test
```

### 开发模式

```bash
# 使用 pm2 开发模式（带 watch）
pm2 start ecosystem.config.cjs --only emberclaw-dev

# 或直接运行
npx tsx src/daemon/index.ts
```

---

## 架构概览

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         EmberClaw                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CLI Layer                             │   │
│  │                 bin/emberclaw.mjs                        │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────┴─────────────────────────────────┐   │
│  │                  Orchestrator                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │embedded │  │ gateway │  │   app   │  │   web   │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────┴─────────────────────────────────┐   │
│  │                    Daemon                                │   │
│  │  ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐          │   │
│  │  │ Logger │ │ Monitor │ │ Health │ │ Backup │          │   │
│  │  └────────┘ └─────────┘ └────────┘ └────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────┴─────────────────────────────────┐   │
│  │                 claw-code-parity                         │   │
│  │              (Rust 编程引擎)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → CLI → Orchestrator → Agent Selection → Task Execution
                      ↓
                  Workflow
              (Plan → TDD → Review → Deploy)
                      ↓
                Agent Results → Response
```

---

## 模块说明

### 1. Orchestrator 模块

负责多 Agent 协调和工作流管理。

#### types.ts

定义核心类型：
- `AgentDomain`: 'embedded' | 'gateway' | 'app' | 'web'
- `Task`, `TaskResult`: 任务和结果
- `WorkflowStage`: 'planning' | 'tdd' | 'review' | 'deploy'

#### agent-dispatch.ts

任务到 Agent 的路由逻辑：

```typescript
// 关键函数
inferTaskType(description: string): TaskType
mapTaskToAgent(taskType: TaskType): AgentDomain
groupTasksByAgent(tasks: Task[]): Map<AgentDomain, Task[]>
canRunInParallel(tasks: Task[]): boolean
```

#### workflow.ts

工作流编排：

```typescript
class WorkflowOrchestrator {
  async plan(tasks: Task[]): Promise<void>
  async executeTDD(tasks: Task[]): Promise<TaskResult[]>
  async review(results: TaskResult[]): Promise<boolean>
  async deploy(results: TaskResult[]): Promise<void>
}
```

#### communication.ts

Agent 间通信：

```typescript
class AgentCommunicator { /* push-based 消息 */ }
class SteerManager { /* 重试/中止 */ }
class ResultFileManager { /* 文件共享 */ }
```

### 2. Daemon 模块

后台服务管理。

#### logger.ts

JSONL 结构化日志：

```typescript
class Logger {
  error(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  debug(msg: string, meta?: Record<string, unknown>): void
}
```

#### monitor.ts

系统监控：

```typescript
class Monitor {
  start(): void
  stop(): void
  async check(): Promise<void>
  updateAgentStatus(agentId: string, status: AgentStatus): void
  recordTaskResult(success: boolean): void
}
```

#### health.ts

HTTP 健康检查服务器：

```typescript
class HealthServer {
  async start(): Promise<void>
  stop(): Promise<void>
  recordTaskCompletion(taskId: string, success: boolean): void
}
```

#### backup.ts

备份管理：

```typescript
class BackupManager {
  async createBackup(type: 'incremental' | 'full'): Promise<BackupManifest>
  async restore(backupId: string): Promise<void>
  listBackups(): BackupManifest[]
}
```

---

## 扩展指南

### 添加新 Skill

1. 创建目录：`skills/<skill-name>/`
2. 创建 `SKILL.md`：

```markdown
# <Skill Name>

## 概述
描述技能用途...

## 触发条件
- 关键词: xxx, yyy
- 文件类型: *.xyz

## 操作指南
...
```

3. 在 Agent 配置中引用：

```jsonc
// config/agents/embedded.jsonc
{
  "skills": ["existing-skill", "new-skill"]
}
```

### 添加新 Agent

1. 创建配置文件：`config/agents/<agent-name>.jsonc`

```jsonc
{
  "id": "new-agent",
  "name": "New Agent",
  "skills": ["skill1", "skill2"],
  "subagents": { "allowAgents": [] },
  "sandbox": { "mode": "workspace" }
}
```

2. 在主配置中注册：

```jsonc
// config/agents/emberclaw.jsonc
{
  "agents": {
    "list": [
      // ... 现有 agents
      { "$ref": "./new-agent.jsonc" }
    ]
  }
}
```

3. 更新 orchestrator 白名单：

```jsonc
{
  "id": "emberclaw-main",
  "subagents": {
    "allowAgents": ["embedded", "gateway", "app", "web", "new-agent"]
  }
}
```

### 添加新 Daemon 服务

1. 在 `src/daemon/` 创建模块
2. 定义类型在 `types.ts`
3. 在 `index.ts` 中集成和导出

---

## 测试

### 运行测试

```bash
# 所有测试
npm test

# 仅 orchestrator 测试
npx tsx tests/orchestrator.test.ts

# 仅 daemon 测试
npx tsx tests/daemon.test.ts

# 类型检查
npm run typecheck
```

### 编写测试

测试文件命名：`tests/<module>.test.ts`

```typescript
// tests/example.test.ts
import { YourModule } from '../src/your-module/index.js';

async function testYourFeature(): Promise<void> {
  const module = new YourModule();
  // 测试逻辑
  console.log('✓ Test passed');
}

testYourFeature();
```

---

## 贡献指南

### 分支策略

- `main`: 稳定版本
- `feat/*`: 新功能
- `fix/*`: Bug 修复
- `docs/*`: 文档更新

### 提交规范

使用 Conventional Commits：

```
<type>(<scope>): <description>

[optional body]
```

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `refactor`: 重构
- `test`: 测试
- `chore`: 杂项

### Pull Request 流程

1. Fork 仓库
2. 创建功能分支
3. 编写代码和测试
4. 确保测试通过
5. 提交 PR

### 代码风格

- 使用 TypeScript 严格模式
- ESM 模块（`.js` 扩展名在导入中）
- 有意义的变量和函数名
- 适当的注释（解释"为什么"而非"是什么"）

---

## 相关资源

- [OpenClaw 文档](https://github.com/openclaw/openclaw)
- [claw-code-parity](https://github.com/ultraworkers/claw-code-parity)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

---

*© 2026 EmberClaw Team*
