# EmberClaw - 长期 CLI 编程 Agent 项目规划文档

## 项目名称

**EmberClaw** 🦊

> **Ember**（余烬/火种）+ **Claw**（爪/工具）
>
> 象征着在应急场景下可靠、强大的编程助手能力

---

## 项目愿景

打造一个完全私有、可长期迭代的 CLI 编程 Agent，成为你的"24/7 IoT 系统开发搭档"。

### 核心能力

它能自主处理以下领域：

- 📡 **Nordic nRF 固件 + nRF Mesh 开发**
- ⚡ **开关电源控制驱动**
- 🍓 **树莓派 Linux 网关部署与调试**
- 📱 **iOS / Android App 开发**
- 🌐 **Web 前端 + 后端 + 数据库 + 服务器对接**
- 🔄 **端到端集成测试、部署、监控**

---

## 核心技术栈

### 推荐最终方案

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **主框架** | OpenClaw | Agent 生命周期、会话管理、多 Agent 路由、持久化记忆、插件系统 |
| **编程核心引擎** | claw-code-parity (Rust) | headless coding runtime，提供 git worktree、tool calling、sub-agent 执行等 |
| **技能系统** | Superpowers + Drift + nordic-nrf + IoT 专属 skills | 继承现有能力 + 新增 IoT 专属 |
| **工具层** | Serial MCP / SSH MCP / GitHub MCP / Database MCP / Docker MCP | 硬件操作与系统集成 |
| **语言** | TypeScript + Rust | TypeScript（主语言）+ Rust（性能关键部分） |
| **部署** | 本地 Docker + systemd / pm2 | 后台运行，可选服务器部署 |

### 关键依赖

- [OpenClaw](https://github.com/openclaw/openclaw) - 主框架
- [claw-code-parity](https://github.com/ultraworkers/claw-code-parity) - Rust 编程引擎（上游维护仓库）

---

## 分阶段实施计划

> 预计总耗时：**3-6 周**（视投入时间而定）

### 阶段总览

| 阶段 | 目标 | 预计时间 | 优先级 |
|------|------|---------|--------|
| 阶段 0 | 环境就绪 | 1-2 天 | ★★★★★ |
| 阶段 1 | 基础骨架 | 3-5 天 | ★★★★★ |
| 阶段 2 | 技能迁移 | 5-7 天 | ★★★★ |
| 阶段 3 | 工具增强 | 4-6 天 | ★★★★★ |
| 阶段 4 | 多 Agent & 流程 | 5-7 天 | ★★★★ |
| 阶段 5 | 长期维护 | 3-5 天 | ★★★ |

---

### 阶段 0：准备（环境就绪）

**目标：** 搭建可运行的开发环境

#### 主要任务

- [ ] Fork OpenClaw 仓库
- [ ] Fork claw-code-parity 仓库
- [ ] 搭建本地开发环境
- [ ] 配置 Anthropic API Key
- [ ] 配置其他 LLM（可选）
- [ ] 验证 OpenClaw CLI 可启动

#### 输出物

- ✅ 运行中的 OpenClaw CLI
- ✅ Rust binary 编译成功

---

### 阶段 1：基础骨架（可运行的 CLI Agent）

**目标：** 集成 claw-code Rust 作为 coding engine

#### 主要任务

- [ ] 集成 claw-code Rust 作为 coding engine
- [ ] 实现基本 REPL 交互
- [ ] 实现 git worktree 支持
- [ ] 实现自动 commit / push（配置 PAT）
- [ ] 基本命令行参数解析

#### 输出物

- ✅ `emberclaw` 命令可启动
- ✅ 可创建/切换 worktree
- ✅ 可进行基本的编程对话

---

### 阶段 2：技能迁移（继承现有能力）

**目标：** 迁移现有技能并开发 IoT 专属 skills

#### 主要任务

##### 2.1 迁移现有技能

- [ ] 迁移 Superpowers skills
- [ ] 迁移 Drift 代码一致性检查
- [ ] 迁移 nordic-nrf 技能
- [ ] 整理 AGENTS.md / SOUL.md

##### 2.2 开发 IoT 专属 Skills

- [ ] `nordic-mesh` - nRF Mesh 开发技能
- [ ] `power-control` - 开关电源控制技能
- [ ] `rpi-gateway` - 树莓派网关技能
- [ ] `ios-dev` - iOS 开发技能
- [ ] `android-dev` - Android 开发技能
- [ ] `embedded-testing` - 嵌入式测试技能

#### 输出物

- ✅ 完整的 skills 目录
- ✅ AGENTS.md（项目上下文）
- ✅ SOUL.md（长期记忆）

---

### 阶段 3：工具增强（真正可操作硬件）

**目标：** 接入硬件操作工具

#### 主要任务

- [ ] 集成 Serial MCP（串口通信）
- [ ] 集成 SSH MCP（远程设备操作）
- [ ] 集成 Database MCP（数据库操作）
- [ ] 集成 Docker MCP（容器管理）
- [ ] 集成 GitHub MCP（仓库管理）
- [ ] 实现权限沙箱（安全隔离）

#### 输出物

- ✅ Agent 可直接操作开发板
- ✅ Agent 可直接操作树莓派
- ✅ Agent 可管理 Docker 容器

---

### 阶段 4：多 Agent & 流程（生产级能力）

**目标：** 实现 sub-agent 协同工作

#### 主要任务

##### 4.1 Sub-Agent 分组

- [ ] **嵌入式组** - Nordic / 电源控制
- [ ] **网关组** - 树莓派 / Linux
- [ ] **App 组** - iOS / Android
- [ ] **Web 组** - 前端 / 后端 / 数据库

##### 4.2 流程集成

- [ ] 集成 Superpowers 全流程
  - Planning → TDD → Review → Deploy
- [ ] 实现多 Agent 并行调度
- [ ] 实现 Agent 间通信协议

#### 输出物

- ✅ 可并行处理多个模块
- ✅ 端到端任务自动化

---

### 阶段 5：长期维护（可持久运行）

**目标：** 生产级部署与运维

#### 主要任务

##### 5.1 部署方案

- [ ] Docker 化
- [ ] systemd 服务配置
- [ ] pm2 备选方案
- [ ] 自动更新机制

##### 5.2 运维监控

- [ ] 日志系统
- [ ] 监控告警
- [ ] 记忆备份
- [ ] 健康检查

##### 5.3 文档

- [ ] 用户使用手册
- [ ] 开发者文档
- [ ] API 文档

#### 输出物

- ✅ 后台 daemon 服务
- ✅ 完整运维文档
- ✅ 用户手册

---

## 关键功能清单

### MVP 功能（阶段 1-3 必须实现）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| CLI 交互 | 持久会话支持 | ★★★★★ |
| git worktree | 隔离开发环境 | ★★★★★ |
| 自动 commit / push | 已配置 PAT | ★★★★ |
| Drift 检查 | 代码一致性检查 | ★★★★ |
| Nordic / nRF Mesh | 专属技能 | ★★★★★ |
| Serial 工具 | 串口通信 | ★★★★★ |
| SSH 工具 | 远程设备操作 | ★★★★★ |

### 进阶功能（阶段 4-5）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 多 sub-agent 并行 | Planner / Coder / Reviewer / Tester | ★★★★ |
| 端到端任务 | "实现电源控制 → 测试 → 部署到网关" | ★★★★ |
| 自动文档生成 | 文档、测试用例、Mesh 配置 | ★★★ |
| 多渠道控制 | 语音 / Telegram / Discord | ★★ |
| 记忆系统 | SOUL.md + 向量数据库 | ★★★ |

---

## 风险与备选方案

### 风险评估

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| OpenClaw 更新太快 | 难以跟进上游变更 | 采用 fork + 定期 merge 策略 |
| Rust 集成难度 | 开发周期延长 | 先用 OpenClaw 原生工具，逐步替换 |
| LLM API 成本 | 运营成本高 | 支持本地模型（Ollama / LM Studio） |
| 硬件兼容性 | 特定设备不支持 | 维护硬件兼容性列表 |

### 备选方案

#### 备选方案 A：LangClaw

如果 OpenClaw 太重，可切换到 **LangClaw**（LangChain + OpenClaw 混合）

**优点：**
- LangChain 生态成熟
- 更容易集成新模型
- 社区支持活跃

**缺点：**
- 需要重新适配
- 可能丢失 OpenClaw 特有功能

#### 备选方案 B：极简 Rust

如果想极简，可直接 **fork claw-code Rust** 自己搭上层

**优点：**
- 完全控制
- 性能最优
- 无外部依赖

**缺点：**
- 开发工作量大
- 需要从零实现很多功能

---

## 项目结构（建议）

```
emberclaw/
├── docs/
│   ├── plan/              # 规划文档
│   ├── guides/            # 使用指南
│   └── api/               # API 文档
├── src/
│   ├── core/              # 核心引擎
│   ├── agents/            # Agent 定义
│   ├── skills/            # 技能系统
│   ├── tools/             # 工具层
│   └── utils/             # 工具函数
├── skills/
│   ├── nordic-mesh/       # nRF Mesh 技能
│   ├── power-control/     # 电源控制技能
│   ├── rpi-gateway/       # 树莓派网关技能
│   └── ...                # 其他技能
├── config/
│   ├── mcp/               # MCP 配置
│   └── agents/            # Agent 配置
├── tests/
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── e2e/               # 端到端测试
├── scripts/
│   ├── setup.sh           # 安装脚本
│   └── deploy.sh          # 部署脚本
├── AGENTS.md              # 项目上下文
├── SOUL.md                # 长期记忆
├── Cargo.toml             # Rust 配置
├── package.json           # Node.js 配置
└── README.md              # 项目说明
```

---

## 下一步行动

### 立即执行（阶段 0）

1. **Fork 仓库**
   ```bash
   # Fork OpenClaw
   gh repo fork openclaw/openclaw --clone
   
   # Fork claw-code
   gh repo fork openclaw/claw-code --clone
   ```

2. **配置环境**
   ```bash
   # 安装 Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # 安装 Node.js (推荐使用 nvm)
   nvm install --lts
   
   # 配置 Anthropic API Key
   export ANTHROPIC_API_KEY="your-key-here"
   ```

3. **验证安装**
   ```bash
   # 构建 OpenClaw
   cd openclaw
   npm install
   npm run build
   
   # 构建 claw-code
   cd ../claw-code
   cargo build --release
   ```

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-04-02 | v0.1.0 | 初始规划文档 |

---

## 参考资源

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [claw-code GitHub](https://github.com/openclaw/claw-code)
- [Superpowers Repository](https://github.com/anthropics/superpowers)
- [Nordic nRF SDK](https://www.nordicsemi.com/Products/Development-software/s132-softdevice)
- [nRF Mesh SDK](https://www.nordicsemi.com/Products/Development-software/nrf-mesh-sdk)

---

*本文档将随项目进展持续更新*
