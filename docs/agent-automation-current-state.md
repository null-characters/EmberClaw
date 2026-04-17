# Agent 自动化：现状、差距与目标方案

本文档整理 EmberClaw / OpenClaw / claw-code-parity 在本机使用过程中的**目标、现状、已遇问题**，**为何 `--local` 不足以替代监工**，以及一份**以 OpenClaw Gateway 为核心的高完整度目标架构**与分阶段落地步骤（不涉及具体密钥，配置请仅写在 `~/.openclaw/` 等本地路径）。

### 进度快照（2026-04 更新）

下列状态为**本仓库维护者在一台参考开发机上的记录**，用于说明「曾跑通到哪一步」；**不表示**其他同事或 CI 环境默认已具备同等配置，亦**不**替代各人按文档在本机重复验证。

| 项 | 状态 | 说明 |
|----|------|------|
| OpenClaw + OpenAI 兼容模型 | ✅ 参考环境曾验证 | `openclaw agent --local`、`models.status`、Gateway 下默认 agent 走 `openai-compatible/...`（见 §3.3）。 |
| **Gateway + 企业微信 Bot（WebSocket）** | ✅ 参考环境曾验证 | 官方插件 `@wecom/wecom-openclaw-plugin`；`channels.wecom` Bot 模式；私聊收发与模型回复曾在该环境端到端成功（见 **§3.5**）。 |
| §8 阶段 1（Node、模型、Gateway 进程） | ✅ 参考环境已具备 | 该环境曾以前台 `gateway run` 为主；`gateway install` 系统服务为可选项。 |
| §8 阶段 2（首个持久化「构建验证」类任务） | ⏳ 未落地 | YAML 仍为模板；需映射到 `cron` / `agent` / hooks 等真实 CLI（见 §8.2、§8.5）。 |
| 企微侧「操作 emberclaw CLI」 | ❌ 非默认能力 | 企微渠道 = **与 Gateway 上 Agent 对话**；`emberclaw worktree`、`commit-push` 等需任务编排或显式工具策略后才可能接入（见 §3.5）。 |

---

## 1. 原始目标

- **业务目标**：用 agent **自动化管理任务**，减少人工「监工」（持续跟进、重复触发、结果汇总）。
- **模型偏好**：使用 **OpenAI 兼容（类 OpenAI 协议）** 的任意提供商（`baseUrl` + `apiKey` + 模型 id）；在 `openclaw.json` 中常表现为 `openai-compatible/<model-id>`。**不绑定单一厂商**；文中出现的具体模型 id（如 `kimi-k-2-5`）仅作**配置示例**。
- **典型场景示例**：在 Android 工程（如 SmartEmergencyMesh）中做 **编译验证**（如 `assembleDebug`）、根据日志判断成败并得到可执行建议。

### 1.1 你最初要的“远程托管 + 远程控制”到底是什么

为避免把“能远程聊天”误认为“能远程托管自动化”，这里把目标拆成三层：

| 层级 | 你要的能力 | 典型验收 |
|------|------------|----------|
| **托管（Hosting）** | 电脑端 agent **常驻**（开机自启、自愈、日志/产物留存、升级策略） | 重启电脑后不打开终端，企微仍能对话/触发任务 |
| **控制面（Control Plane）** | 你在外部（企微/网页/CI webhook）发起**触发/暂停/查询/审批** | 企微发“build now”，电脑端执行并回结果；或 CI POST webhook 触发同任务 |
| **执行面（Execution Plane）** | 电脑端执行**受控命令**（固定脚本/白名单），并以固定格式回传 | 任务输出统一格式；高风险动作需要审批；有审计记录 |

**当前进展定位**：我们已经把“企微对话入口”与“cron → 脚本 → 企微回推”的最小闭环跑通，但距离完整的“托管 + 控制面产品化”还需要补齐（见 §9 任务清单）。

---

## 2. 仓库内相关组件（概念对齐）

| 名称 | 路径 / 入口 | 角色 |
|------|-------------|------|
| **emberclaw** | `bin/emberclaw.mjs` | Node 包装：默认**透传**到 Rust 二进制 `claw`，并附带 `worktree`、`commit-push` 等子命令。 |
| **claw-code-parity** | `claw-engine/claw-code-parity/rust/` | Rust 实现的 **claw** CLI：交互式 REPL、斜杠命令、偏「编码代理」工作流。 |
| **OpenClaw** | `openclaw/`（子模块） | Node 生态下的 **OpenClaw** 全套（Gateway、channels、agent、cron 等），**支持多模型与 OpenAI 兼容提供商**。 |

三者关系：**emberclaw ≠ OpenClaw**。日常说的「用 emberclaw 开 REPL」实际是在跑 **claw（Rust）**，不是 `openclaw/openclaw.mjs`。

---

## 3. 已执行与已验证的事实

### 3.1 引擎构建

- **claw（Rust）**：通过 `npm run build:engine`（或等价 `cargo build --release -p rusty-claude-cli`）可成功产出 `claw-engine/claw-code-parity/rust/target/release/claw`。
- **结论**：**claw-code-parity 可以构建、可以运行**；问题不在「能否编译」，而在「接哪一家 API、CLI 是否接 OpenAI 兼容链路」。

### 3.2 运行 emberclaw / claw 时的现象

- 使用 **仅配置 OpenAI 兼容端点、不配 Anthropic** 去跑 **emberclaw（claw）** 时，会出现 **Anthropic 凭证缺失** 类错误（或等价提示）。
- **原因（实现层面）**：claw 的 CLI 主路径使用 **`AnthropicClient`** 与 `resolve_startup_auth_source` 等逻辑；crate 内虽有 **OpenAI 兼容客户端**（如 `OpenAiCompatClient`），但 **未接入当前 CLI 的主运行时**，因此 **不能** 通过「只配 OpenAI 兼容 API」让 emberclaw/claw REPL 走该类端点。
- **推论**：在**坚持 OpenAI 兼容链路、不配置 Anthropic** 的前提下，**emberclaw 无法作为「完整 claw 编码代理 REPL」的等价替代**。

### 3.3 OpenClaw + OpenAI 兼容提供商

- OpenClaw 要求 **Node.js v22.12+**（以 `openclaw.mjs` 内版本检查为准）；若本机长期为 Node 20，需 **nvm 等切换到 Node 22**。
- 在 `~/.openclaw/openclaw.json` 与 agent 侧 `models.json` 等配置正确时，`openclaw models status` 可显示默认模型为 **`openai-compatible/<你的模型 id>`**（例如曾验证过的 `kimi-k-2-5` 仅作示例）。
- **`openclaw agent --local`**：可在**不启动 Gateway** 的情况下跑一轮（或同会话多轮需继续发消息），示例需带 **`--session-id`**（或 `--to` / `--agent` 等会话选择参数，以当前 CLI 帮助为准）。
- **验证**：使用 `--local --session-id <id> --message "..."` 可得到模型回复，说明 **经 OpenClaw 本地 agent、走 OpenAI 兼容提供商** 的路径可用。

### 3.4 与「监工式自动化」的差距（核心结论）

| 能力 | emberclaw + claw（Anthropic） | openclaw agent --local（OpenAI 兼容） |
|------|------------------------------|----------------------------------------|
| 完整编码 REPL / 斜杠工作流 | 有（需 Anthropic） | 非同一产品形态 |
| OpenAI 兼容（类 OpenAI 协议） | 不支持（claw CLI 未接该链路） | 支持（由 OpenClaw 配置决定具体厂商） |
| 无人值守、多步任务编排、定时、审批 | 需外层系统；claw 本身是交互会话 | **单轮/会话轮次 ≠ 任务编排**；完整自动化通常需 **Gateway、cron/tasks、node 主机与工具策略** 等 |

因此：**当前以 `openclaw agent --local` 或 shell 封装为主的用法，主要解决「用 OpenAI 兼容模型对话」；并未自动具备「任务队列、失败重试、验收门禁、7×24 调度」等监工替代能力。**

### 3.5 企业微信（WeCom）× OpenClaw Gateway（参考环境验证记录）

以下为**维护者参考开发机**上曾**实际跑通**的结论，供对齐预期与排错；**密钥与 botId/secret 仅允许存在于本机** `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`），**禁止**写入本仓库（步骤见 [openclaw-wecom-practice.md](./openclaw-wecom-practice.md)）。

- **插件**：`@wecom/wecom-openclaw-plugin` 安装于用户扩展目录（如 `~/.openclaw/extensions/wecom-openclaw-plugin`），Gateway 启动时可加载（若 `plugins.allow` 为空，可能出现「自动发现扩展」类提示，可按官方建议收紧白名单）。
- **通道配置**：`channels.wecom` 使用 **Bot 模式**（`botId`、`secret`、`enabled`）；与企微开放平台 **WebSocket 长连接**（`wss://openws.work.weixin.qq.com`）建连并完成鉴权后，心跳按插件策略运行。
- **端到端验证（参考环境）**：企业微信 **私聊** 发送文本 → Gateway 日志可见 `aibot_msg_callback` → 路由至默认 agent（所配置的 **OpenAI 兼容**模型）→ 插件经 WebSocket **回传回复**且企微侧 **ack** 成功。说明在该环境下 **「企微客户端 ↔ 运行 Gateway 的机器上的对话型 Agent」** 链路曾接通；换机或重装需按实践文档重做配置。
- **能力边界（重要）**：
  - 这是 **对话入口**，不是 §8 阶段 2 的 **任务状态机**；**不**等同于已完成「CI webhook → 构建 → 分析 → 审批」流水线。
  - **不能**默认把整条 **`emberclaw` CLI**（如 `worktree`、`commit-push`）当作企微里可直接点的命令；若需要，须在 Gateway 侧配置 **受控工具 / 任务步骤**（§8.2、§8 阶段 2）并评估安全边界。

---

## 4. 当前无法实现「自动化任务管理」的原因（归纳）

1. **工具链错位**  
   - 期望：**一个**入口同时满足「claw 级编码代理 + OpenAI 兼容模型」。  
   - 实际：**claw CLI 只接 Anthropic**；**OpenAI 兼容走 OpenClaw**。两者是不同运行时，不能靠同一套 `emberclaw` 无感切换。

2. **「Agent」与「自动化运维」层级不同**  
   - **对话型 agent**：回答问题、可能带工具（取决于 OpenClaw 配置与是否起 Gateway）。  
   - **少监工自动化**：需要 **明确的状态机**（任务定义、输入输出、成功条件、失败重试、通知、人工介入点），通常由 **调度器（cron/CI/队列）+ 执行环境（脚本/容器/node）+ 可选 LLM 决策** 组成。  
   - 仅 **`agent --local` 一条命令** 不等价于上述整套系统。

3. **emberclaw 的附加价值与 REPL 解耦**  
   - `emberclaw worktree`、`emberclaw commit-push` 等 **不依赖 Anthropic**，仍可单独使用。  
   - 但它们 **不替代** OpenClaw Gateway 级别的任务编排。

4. **安全与合规**  
   - API Key、OAuth 仅应存在于本机配置与环境变量；文档与仓库中**禁止**提交真实密钥。

---

## 5. 可选后续方向（简要）

1. **脚本化 + 可选 LLM**：CI/shell 固定执行构建，日志交给 **OpenAI 兼容**模型只做分析（投入小，编排弱）。  
2. **OpenClaw Gateway 全栈编排**：见 **§8**，为「最高完整度、最高体验」的推荐终局。  
3. **本仓库 EmberClaw daemon**：自有队列与健康检查，与 **OpenAI 兼容**或其他模型在应用层集成（自定义开发量大）。  
4. **Anthropic 仅用于 claw REPL**：与 **OpenAI 兼容**双轨；claw-code-parity 若未来接入 OpenAI 兼容，可再统一。

---

## 6. 建议读者自检清单

- [ ] 默认模型：`openclaw models status` 是否为预期（如 `openai-compatible/...`）？  
- [ ] Node：`node -v` 是否满足 OpenClaw 要求？  
- [ ] 单次本地 agent：`openclaw agent --local --session-id <id> --message "..."` 是否成功？  
- [ ] Gateway + 企业微信 Bot：是否在**你的**环境按 [openclaw-wecom-practice.md](./openclaw-wecom-practice.md) 完成插件与 `channels.wecom`，并用 `gateway run`（或等价常驻方式）验证 **WS 鉴权与私聊回复**？（§3.5 仅为维护者参考环境记录，**非**团队默认完成项。）  
- [ ] Gateway **常驻**：是否已 `gateway install` + `start`，或用 pm2/launchd 托管 `gateway run`，避免终端关掉即断连？  
- [ ] 若仍要用 claw：`target/release/claw` 是否存在且 `ANTHROPIC_*` 是否按需配置？  
- [ ] 「自动化」是否已写下：**触发条件、成功条件、失败动作、通知对象**？（§8 阶段 2 仍为待办）

---

## 7. 文档维护

- **用途**：团队内对齐「为什么 OpenAI 兼容模型不能绑在 emberclaw/claw REPL 上」「local agent 不等于任务编排」以及 **§8 目标终局**；并记录 **WeCom × Gateway** 在参考环境的验证进度（见文首进度快照、§3.5），避免被误读为全员开箱即用。  
- **更新时机**：claw-code-parity 若接入 OpenAI 兼容、或 OpenClaw Gateway/cron/tasks/企微插件行为变更时，修订 §3、§3.5、§4、文首进度表、§8.5。

---

## 8. 最终目标方案：OpenClaw Gateway 作为统一大脑（高完整度）

本节为**目标态设计**：用 **OpenClaw Gateway** 做统一编排，把 **OpenAI 兼容（类 OpenAI 协议）** 上的模型作为真正的**任务决策引擎**——不再是单次 `--local` 对话，而是**持久化任务状态机 + 定时调度 + 审批流 + 通知 + 工具链闭环**，趋向「PR / push 之后几乎不用再盯」的少监工体验。

相较 `openclaw agent --local`，预期体验提升一个量级：

- 任务有**明确定义**、**可视化历史**、**自动重试**、**人工审批点**  
- 支持 **webhook / cron** 双触发  
- 可编排调用 **emberclaw** 子命令（`worktree`、`commit-push` 等）与 **gradle / git**  
- **决策走 OpenAI 兼容端点**（可切换厂商/模型），**自动化链路无需 Anthropic**  
- 未来若 **claw-code-parity** 在 CLI 层正式接入 OpenAI 兼容，可再把**编码 REPL** 收拢到同一生态

### 8.1 核心理念（摘要）

| 要点 | 说明 |
|------|------|
| 统一入口 | Gateway 常驻，所有自动化任务经 Gateway，而非零散脚本 |
| 模型 | 在 OpenClaw 中配置 **`openai-compatible/...`**（或官方支持的等价 OpenAI 协议入口）；**任意兼容厂商**均可，不限定某一品牌 |
| 闭环 | 触发 → 执行 → 日志/产物 → 模型判断 → 通知/审批 → 状态落库 |
| 可演进 | 任务定义可版本化进 Git，与基础设施即代码一致 |

### 8.2 整体架构（目标形态）

```text
GitHub / GitLab CI
     ↓ (webhook)
OpenClaw Gateway (常驻 Node 服务)
     ├── Tasks / TaskFlow（持久化后台任务，见 openclaw tasks）
     ├── Cron 调度器（openclaw cron，依赖 Gateway）
     ├── Approval 工作流（以官方配置为准）
     ├── LLM（openai-compatible/<model-id>，类 OpenAI 协议任意厂商）
     ├── Tool / Node 策略（调用 emberclaw、gradle、git 等）
     └── Channels / Notification（**企业微信智能机器人（Bot WebSocket）** 曾在维护者参考环境与 Gateway 对话链路验证；飞书 / 群机器人 Webhook 等并行可选；企微操作步骤见 [openclaw-wecom-practice.md](./openclaw-wecom-practice.md)）
          ↓
Android 项目 SmartEmergencyMesh（或任意工作副本路径）
```

### 8.3 实施步骤（按顺序、可落地）

#### 阶段 1：环境与 Gateway 基础部署（约 1 天）

1. **锁定 Node**（OpenClaw 要求 Node **v22.12+**，以 `openclaw/openclaw.mjs` 内检查为准）：

```bash
nvm install 22.12   # 或已安装的 v22.x
nvm use 22
node -v             # 必须满足 OpenClaw 最低版本
```

2. **确认 OpenAI 兼容模型已就绪**：

```bash
openclaw models status
```

默认模型应为你在 `openclaw.json` 中配置的 **`openai-compatible/<model-id>`**（或官方支持的等价项）；以下为示例而非要求：`kimi-k-2-5`、自建网关上的 `gpt-4o` 别名等。

3. **启动 Gateway（核心）**  
   - 在 `openclaw/` 子模块目录，**以官方文档为准**：[Gateway CLI](https://docs.openclaw.ai/cli/gateway)。  
   - 先查看精确子命令：

```bash
openclaw gateway --help
openclaw gateway run --help      # 前台调试常用
openclaw gateway start --help    # 安装为系统服务（launchd/systemd 等）
```

4. **生产化守护（示例）**  
   - 推荐：`openclaw gateway install` + `gateway start`（由 OpenClaw 管理 launchd/systemd）。  
   - 若用 **pm2** 托管前台进程，通常包装的是 **`openclaw gateway run`**（或你环境验证过的等价命令），**不要臆测** `start` 的 CLI 参数与官方不一致；以 `gateway --help` 为准。

```bash
# 示例思路（需按本机 openclaw 路径与官方推荐调整）
pm2 start "node .../openclaw.mjs gateway run" --name openclaw-gateway
pm2 save
pm2 startup
```

5. **验证**：

```bash
openclaw gateway status
openclaw gateway probe
openclaw gateway call health    # 若文档支持
pm2 logs openclaw-gateway       # 若使用 pm2
```

6. **（已验证可用的最小自动化）用 `cron` 触发一次 agentTurn 并投递到企业微信**  
   这一步不涉及“构建脚本”，只验证 **cron 调度器 → agentTurn → announce → WeCom** 这条自动化链路能稳定工作。

```bash
# 说明：
# - --at 支持 15s/2m/1h 等 duration（不是 "+15s"）
# - --channel 这里用 wecom（由插件提供的 channel id）
# - --to 使用企业微信的 userid（例如你在日志里看到的 from.userid）
openclaw cron add \
  --name wecom-smoke-test \
  --agent main \
  --at 15s \
  --message "企业微信自动化冒烟测试：请回复收到" \
  --announce \
  --channel wecom \
  --to "<你的企业微信userid>" \
  --expect-final \
  --timeout-seconds 60 \
  --delete-after-run
```

对应的可复用脚本模板见：`scripts/openclaw/cron-wecom-smoke-test.sh`。

#### 阶段 2：第一个生产级任务（约 2–3 天，体验核心）

目标：例如 **`smartemergencymesh-build-verify`**——拉取/固定分支 → 构建 → **OpenAI 兼容模型**分析日志 → 成败与建议 → 通知 / 审批。

**说明**：下列 **YAML 为「目标抽象模板」**——字段名、目录（如 `~/.openclaw/tasks/`）、`register`/`test` 等命令**必须以 [OpenClaw 官方文档](https://docs.openclaw.ai) 与当前 `openclaw` CLI 为准**做映射。本仓库内已存在的 CLI 包括：

- `openclaw cron`（`add` / `list` / `run` / …，**经 Gateway**）  
- `openclaw tasks`（审计、列表、TaskFlow 等，偏**运行时观测**）  
- `openclaw agent`（经 Gateway 或 `--local`）

落地时可能组合为：**cron 触发 + agent 消息 + node 执行 shell**，或官方推荐的 **hooks / plugins**，而非单一虚构的 `openclaw task register`。

**示例模板（需按官方 Schema 改写 key 与步骤类型）**：

```yaml
id: smartemergencymesh-build-verify
name: SmartEmergencyMesh assembleDebug 自动验证
description: 更新工作副本 → 构建 → LLM（OpenAI 兼容）分析日志 → 成败判断与建议 → 通知/审批
version: 1.0

trigger:
  types: [webhook, cron]
  cron: "0 */2 * * *"              # 每 2 小时（可调）
  webhook_path: /trigger/build     # CI 完成后 POST（需与 Gateway 路由一致）

execution:
  environment: host                # 或 docker / sandbox，按官方与风控要求
  working_dir: /path/to/SmartEmergencyMesh   # 改为真实路径
  steps:
    - id: sync
      type: command
      # emberclaw worktree 仅支持 list | add | remove，无 checkout；此处用 git 为准
      command: git fetch origin && git checkout main && git pull --ff-only
      timeout: 120

    - id: build
      type: command
      command: ./gradlew assembleDebug --stacktrace --quiet > build.log 2>&1
      timeout: 300
      # working_dir 需指向含 gradlew 的 android 子目录时，在此覆盖或拆分子任务

    - id: analyze
      type: agent
      model: openai-compatible/<your-model-id>   # 例：kimi-k-2-5；按 openclaw.json 中实际 id
      prompt: |
        你是 Android 专家。
        以下是 SmartEmergencyMesh 项目 assembleDebug 的完整构建日志。
        请严格判断：
        1. 构建是否成功（SUCCESS / FAILED）
        2. 若失败，列出主要错误原因与可执行修复建议
        3. 给出下一步建议命令
        日志内容：
        {{step.build.output}}
      output_variable: analysis_result

    - id: decide
      type: decision
      condition: "{{analysis_result.status}} == 'FAILED'"
      true_branch:
        - action: require_approval
        - action: notify
      false_branch:
        - action: notify_success

approval:
  enabled: true
  approvers: ["<企业微信用户 ID 或邮箱>"]
  timeout: 30m

notification:
  channels:
    - type: wecom                 # 或 feishu / dingtalk
      webhook: "<https://your-webhook-url>"
  templates:
    success: "✅ SmartEmergencyMesh 构建成功！"
    failure: "❌ 构建失败\n{{analysis_result.summary}}\n请审批或处理。"
```

**操作建议**（抽象 → 真实 CLI 时需替换）：

- 将任务定义落在**官方指定位置**或 **Git 仓库**中做版本管理。  
- 用文档中的方式注册/触发（若暂无单一 `task register`，则用 **cron + webhook + agent** 拼出等价行为）。

**阶段 2 的“先跑起来”版本（推荐先这样落地）**：用 `cron add --every` 做一个周期性 job，让 agent 只执行你指定的固定脚本并总结，然后 `--announce` 回推到企业微信。  
模板脚本见：`scripts/openclaw/cron-build-verify-template.sh`（不包含任何密钥）。

#### 阶段 3：Cron、Webhook 与外部集成（约 2 天）

- **Cron**：`openclaw cron add` 等（需 Gateway 已运行），见 [cron 文档](https://docs.openclaw.ai/cli/cron)。  
- **Webhook**：CI 最后一步 `curl -X POST` 到 Gateway 暴露的 URL（路径、鉴权 token 以配置为准）。

```yaml
# GitHub Actions 示例（URL/密钥用 secrets）
- name: Trigger OpenClaw
  run: |
    curl -X POST "https://your-gateway-host/trigger/build" \
      -H "Content-Type: application/json" \
      -d '{"project":"SmartEmergencyMesh","branch":"${{ github.ref_name }}"}'
```

#### 阶段 4：体验优化（约 3–5 天，可并行）

- 开启 **Control UI / Dashboard**（若官方提供 `openclaw dashboard` 等）。  
- **Tool / Node 策略**：允许当前配置的 **OpenAI 兼容**模型经 Gateway 调用受控命令（`emberclaw commit-push`、`gradlew` 等），权限最小化。  
- **失败重试**（如 3 次指数退避）、任务历史与成功率统计。  
- **任务即代码**：所有任务定义与 cron 描述 **commit 进仓库**，便于审计与回滚。

### 8.4 与现有组件的最终关系（目标态）

| 组件 | 角色 |
|------|------|
| **OpenAI 兼容 LLM** | 自动化链路中的**决策/摘要模型**（厂商与模型 id 可换）；在 OpenClaw 中统一走 **`openai-compatible/...`**（或官方等价配置）。**非**固定某一品牌。 |
| **OpenClaw Gateway** | **自动化与少监工**的**唯一推荐入口**；体验目标高于 `--local`。 |
| **emberclaw** | **工具 CLI**：`worktree`、`commit-push` 等可在任务步骤中调用；**不依赖 Anthropic**。透传到 **claw REPL** 仍仅 Anthropic。 |
| **claw-code-parity（Rust）** | 日常编码 REPL 仍可选 **Anthropic**；若未来 CLI 接入 **OpenAI 兼容**，可与 Gateway 侧模型策略进一步统一。 |

### 8.5 落地校准（必读）：避免与真实 CLI 脱节

| 文档/模板中的说法 | 实际校准（本仓库 openclaw 子模块 CLI） |
|------------------|----------------------------------------|
| `openclaw gateway start --config ~/.openclaw/openclaw.json` | `gateway start` 用于**系统服务**；配置路径由 **OPENCLAW_CONFIG_PATH** / 默认 `~/.openclaw/openclaw.json` 等决定，**以 `--help` 为准**。前台调试用 **`openclaw gateway run`**。 |
| `openclaw task register` / `task test` | 当前 CLI 为 **`openclaw tasks`**（list/audit/flow 等），**无**保证存在 `task register`。阶段 2 的 YAML 需映射到 **cron + agent + hooks** 或官方 TaskFlow 文档。 |
| `emberclaw worktree checkout` | **不存在**。仅有 `emberclaw worktree list|add|remove`。同步分支请用 **git** 或自建脚本。 |
| `~/.openclaw/tasks/*.yaml` | 目录与格式以 **OpenClaw 官方**为准；可改为**仓库内** `tasks/` 再由部署同步。 |

---

*本文档依据截至编写时的代码与 CLI 行为整理；文首进度快照与 §3.5 反映本仓库维护者在 **2026-04** 于**参考开发机**上的验证记录，**不保证**其他环境无需配置即可复现。§8 为目标架构与实施路线图，具体子命令以 `openclaw --help`、`emberclaw`、`claw --help` 与 [OpenClaw 官方文档](https://docs.openclaw.ai) 为准。*

---

## 9. 新一轮规划：把“远程托管 + 远程控制”做完整（任务清单）

本节把下一轮工作拆成可执行的任务清单，并明确验收标准。**所有密钥必须只存在于本机配置或环境变量**，禁止进入仓库。

### 9.1 Phase A — 托管（把 Gateway 变成真正常驻服务）

- [ ] **A1. Gateway 服务化（macOS launchd）**：用 `openclaw gateway install` + `openclaw gateway start` 取代手动 `gateway run`（或明确使用 pm2 的托管方式与启动项）。
  - **验收**：重启 macOS 后，Gateway 自动启动并监听端口；企微可对话。
- [ ] **A2. 自愈与探活**：建立“探活→异常重启→告警”的最小机制（可以用 cron 定时探活 + 企微告警）。
  - **验收**：手动 kill 进程后能自动恢复，且在企微收到一次告警。
- [ ] **A3. 日志/产物落盘策略**：将构建日志与产物落到稳定目录（例如 `~/.openclaw/artifacts/automation/`），并保留最近 N 次（清理策略明确）。
  - **验收**：连续运行多次任务后，目录结构稳定、不会无限增长。

### 9.2 Phase B — 控制面（让“远程触发”成为第一入口）

- [ ] **B1. 远程一键触发（企微指令）**：定义最小指令集，例如：
  - `build now`：立即跑一次构建验证
  - `build status`：返回最近一次任务状态与 log 路径
  - `build disable/enable`：启停定时任务
  - **验收**：你在企微发指令，电脑端执行对应动作并回统一格式结果。
- [ ] **B2. 事件触发（webhook）**：提供一个受保护的触发入口（例如 CI POST），触发同一套固定脚本。
  - **验收**：外部 POST 一次，企微收到一次构建结果。
- [ ] **B3. 可观测性**：把 `openclaw tasks list/show` 的关键字段（status/startedAt/duration/log）标准化成统一回复格式。
  - **验收**：企微里可查询到最近 N 次执行摘要。

### 9.3 Phase C — 权限与安全边界（把 exec 变成可审计的能力）

- [ ] **C1. 固定脚本白名单**：明确“只允许运行固定脚本”的策略（例如仅允许 `scripts/automation/build-and-summarize.sh`，且脚本内部再固定允许的 BUILD_CMD）。
  - **验收**：任意其它命令触发会被拒绝/不执行，并在企微返回拒绝原因。
- [ ] **C2. 高风险动作审批**：对 push/commit/发布等动作引入审批（企微确认/allowlist），低风险动作免审批。
  - **验收**：未审批时无法执行高风险动作；审批通过后才能继续。
- [ ] **C3. 身份与范围**：`dmPolicy allowlist`、`groupPolicy disabled` 等策略落地，并记录“管理员列表/可触发动作范围”。
  - **验收**：非 allowlist 用户无法触发任务。

### 9.4 Phase D — 自动化任务库（从“构建验证”扩展到可复用工作流）

- [ ] **D1. Build Verify（已跑通，需固化）**：将真实项目（如 SmartEmergencyMesh）的 WORKDIR/BUILD_CMD 固化为可配置项（本机路径写在本机 config，不进仓库）。
  - **验收**：定时运行 + 远程触发都能稳定执行并回推。
- [ ] **D2. Test/Lint**：增加 `testDebugUnitTest` / ktlint 等任务模板。
- [ ] **D3. 产物上传/链接回推**：将 APK/报告产物路径回推到企微（必要时上传到内部制品库）。

