# 阶段 4 进度记录：多 Agent 分组 & 流程集成

**阶段目标：** 实现 sub-agent 协同工作，按 IoT 全栈领域分组，并行处理多模块

**开始日期：** 2026-04-07

---

## 架构设计

### 能力分析

| 引擎 | Sub-Agent 能力 | 限制 |
|------|----------------|------|
| **OpenClaw** | `sessions_spawn`（run/session 模式），push-based 通知，`maxSpawnDepth` 可配置，per-agent `allowAgents` 白名单 | 默认 `maxSpawnDepth=1`，并发 `maxConcurrent=4` |
| **claw-code-parity** | `Agent` tool -> 独立 OS thread + 隔离 `ConversationRuntime`，文件级持久化结果 | 顺序 tool 执行，无原生 team 概念 |

**架构结论：** OpenClaw 层做编排+路由，claw-code-parity 层做单 agent 执行。分组通过 OpenClaw `agents.list[]` + `allowAgents` 实现。

---

## Agent 分组

### embedded - 嵌入式 Agent（depth 1, leaf）

- Skills: nordic-nrf, nordic-mesh, power-control, nrf-sdk, embedded-testing
- CLI: west, nrfjprog, JLinkRTTClient, ninja, cmake
- sandbox: workspace-only
- allowAgents: []

典型任务：nRF52840 固件编译/烧录、Mesh 模型配置、电源驱动调试

### gateway - 网关 Agent（depth 1, leaf）

- Skills: rpi-gateway, docker-ci, github, embedded-testing
- CLI: docker, docker compose, gh
- sandbox: workspace-only
- allowAgents: []

典型任务：Docker 多阶段构建、GitHub Actions CI、BLE->MQTT 部署

### app - 移动端 Agent（depth 1, leaf）

- Skills: ios-dev, android-dev, xcode-build, android-build
- CLI: xcodebuild, xcrun, ./gradlew, adb
- sandbox: workspace-only
- allowAgents: []

典型任务：iOS/Android 构建、模拟器测试、BLE 连接 UI 同步

### web - Web Agent（阶段 5 占位）

- Skills: 待定
- CLI: npm, node, docker
- allowAgents: []

---

## 流程集成：Planning -> TDD -> Review -> Deploy

**Planning（Orchestrator, depth 0）：**
- 接收用户任务，匹配 agent 分组，生成子任务计划

**TDD（Sub-Agents 并行）：**
- sessions_spawn 分发，mode: "run"，leaf 限制
- push-based 通知完成

**Review（Gate）：**
- 汇总结果，检查 lint/测试/安全
- 不通过 -> steer 重试

**Deploy（Target）：**
- spawn 对应 build skill 执行构建/烧录/部署

---

## 并发模型

### 三端同步构建（无依赖，并行）

```
orchestrator
  ├── spawn embedded: "编译 nRF52840 固件"
  ├── spawn gateway:  "构建 Docker 镜像"
  └── spawn app:      "构建 iOS + Android"
```

### 固件->App 联调（有依赖，串行）

```
orchestrator
  ├── spawn embedded: "编译并烧录 nRF52840"
  └── (等待 push 通知)
        └── spawn app: "启动模拟器测试 BLE 连接"
```

---

## OpenClaw 配置草案

```jsonc
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxSpawnDepth": 2,
        "maxConcurrent": 4
      }
    },
    "list": [
      {
        "id": "emberclaw-main",
        "skills": ["github", "docker-ci"],
        "subagents": {
          "allowAgents": ["embedded", "gateway", "app", "web"]
        }
      },
      {
        "id": "embedded",
        "skills": ["nordic-nrf", "nordic-mesh", "power-control", "nrf-sdk", "embedded-testing"],
        "subagents": { "allowAgents": [] }
      },
      {
        "id": "gateway",
        "skills": ["rpi-gateway", "docker-ci", "github", "embedded-testing"],
        "subagents": { "allowAgents": [] }
      },
      {
        "id": "app",
        "skills": ["ios-dev", "android-dev", "xcode-build", "android-build"],
        "subagents": { "allowAgents": [] }
      },
      {
        "id": "web",
        "skills": [],
        "subagents": { "allowAgents": [] }
      }
    ]
  }
}
```

---

## 任务清单

### 4.1 Sub-Agent 分组

- [x] 定义 `embedded` agent 配置 + 验证 skill 加载
- [x] 定义 `gateway` agent 配置 + 验证 skill 加载
- [x] 定义 `app` agent 配置 + 验证 skill 加载
- [x] 定义 `web` agent 配置（占位）
- [x] 创建 orchestrator 的 agent dispatch 逻辑

### 4.2 流程集成

- [x] 实现 Planning -> agent 选择逻辑
- [x] 实现 TDD 并行分发（sessions_spawn）
- [x] 实现 Review gate（结果汇总 + 质量检查）
- [x] 实现 Deploy 触发（构建/烧录/部署）
- [x] 端到端测试：嵌入式编译 + iOS 构建并行任务

### 4.3 Agent 间通信

- [x] 验证 push-based 通知机制
- [x] 实现 steer 机制（失败重试）
- [x] 实现结果文件共享（workspace 内）

---

## 实现文件

### Agent 配置
- `config/agents/emberclaw.jsonc` — 主配置（orchestrator + 4 个领域 agent）
- `config/agents/embedded.jsonc` — 嵌入式 Agent 配置
- `config/agents/gateway.jsonc` — 网关 Agent 配置
- `config/agents/app.jsonc` — 移动端 Agent 配置
- `config/agents/web.jsonc` — Web Agent 配置（阶段 5 占位）

### Orchestrator 模块
- `src/orchestrator/types.ts` — 类型定义
- `src/orchestrator/agent-dispatch.ts` — Agent 分发逻辑
- `src/orchestrator/workflow.ts` — 工作流编排
- `src/orchestrator/communication.ts` — Agent 间通信
- `src/orchestrator/index.ts` — 模块入口

### 测试
- `tests/orchestrator.test.ts` — 端到端测试

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-04-07 | v0.1.0 | 阶段 4 规划：多 Agent 分组架构设计完成 |
| 2026-04-07 | v0.2.0 | 阶段 4 实现：Agent 配置、Orchestrator 模块、端到端测试完成 |
