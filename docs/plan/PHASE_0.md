# 阶段 0：环境就绪 — 进度记录

> 对应总规划：[PROJECT_PLAN.md](./PROJECT_PLAN.md)「阶段 0」  
> 最后更新：**2026-04-02**

---

## 状态：已完成 ✅

阶段 0 目标已达成，可进入 [阶段 1](./PHASE_1.md)。

---

## 目标回顾

搭建 EmberClaw 后续开发所需的可运行环境：OpenClaw 主框架、Rust 引擎（claw-code-parity）、工具链与基础验证。

---

## 任务清单（勾选即状态）

| 任务 | 状态 | 说明 |
|------|------|------|
| Fork OpenClaw 并纳入主仓库 | ✅ | 以 **git submodule** 挂载：`openclaw/` → `null-characters/openclaw` |
| Fork / 接入 claw-code-parity | ✅ | `ultraworkers/claw-code` 已禁用，改用 **claw-code-parity**；submodule：`claw-engine/claw-code-parity/` |
| 搭建本地开发环境 | ✅ | Node **22.14.0**、**pnpm**、**Rust/Cargo**（rustup）、**GitHub CLI (gh)** |
| 配置模型 API（OpenAI 兼容） | ✅ | `~/.openclaw/openclaw.json` 中 `models.providers.openai-compatible` 已填写；`config validate` 通过；`models status --plain` 可解析当前 primary |
| 配置其他 LLM（可选） | ⬜ | 未额外配置；需要时可再增 provider |
| 验证 OpenClaw CLI 可启动 | ✅ | `npm run start -- --help` 正常 |
| 验证 OpenClaw 可构建 | ✅ | `pnpm install` + `npm run build` |
| 验证 dev Gateway 可启动 | ✅ | `--dev gateway --port 19001` 监听成功（验证后已停止进程） |
| 验证 Rust 引擎可编译 | ✅ | `claw-engine/claw-code-parity/rust` → `cargo build --release` |
| 整理 `~/.openclaw/openclaw.json` | ✅ | 已去 Molili / 无效插件路径；当前使用 OpenAI 兼容 provider 模板并已填实 |

---

## 时间线（简要）

| 日期 | 事项 |
|------|------|
| 2026-04-02 | 仓库关联 GitHub `EmberClaw`；规划文档、README、工具脚本 |
| 2026-04-02 | 非沙盒安装 `gh`（`~/.local/bin`）、Rust（rustup）、PATH 写入 zsh |
| 2026-04-02 | `gh auth`；fork `openclaw`；`claw-code` 不可用 → 使用 **claw-code-parity** fork + clone |
| 2026-04-02 | 主项目采用 submodule：`openclaw`、`claw-engine/claw-code-parity` |
| 2026-04-02 | OpenClaw：Node 22 + pnpm + build；dev gateway 冒烟；Rust release 构建 |
| 2026-04-02 | 清理并去除 Molili 相关 OpenClaw 配置 |
| 2026-04-02 | 填写 OpenAI 兼容 API 模板；`validate` + `models status` 冒烟通过；**阶段 0 收尾** |

---

## 当前目录约定（主仓库内）

```
EmberClaw/
├── openclaw/                      # submodule：OpenClaw 主框架
├── claw-engine/
│   └── claw-code-parity/          # submodule：Rust 引擎（parity 维护线）
├── docs/plan/
│   ├── PROJECT_PLAN.md
│   ├── PHASE_0.md                 # 本文件
│   └── PHASE_1.md
├── skills/                        # 阶段 1+：自定义 skills
└── ...
```

克隆含 submodule：

```bash
git submodule update --init --recursive
```

---

## 输出物对照（规划原文）

| 规划输出物 | 状态 |
|------------|------|
| 运行中的 OpenClaw CLI | ✅ 本机可 `npm run start`（在 `openclaw/` 目录） |
| Rust binary 编译成功 | ✅ `claw-code-parity/rust` release 构建通过 |

---

## 带入阶段 1 的注意点

1. **Node**：OpenClaw 要求 Node ≥ 22.14；构建日志曾提示宜升级至 **22.18+**（可选）。
2. **配置隔离**：调试可用 `openclaw --dev …`，避免反复改正式 `~/.openclaw`。
3. **密钥**：`openclaw.json` 勿提交到 Git；团队场景优先环境变量或私密配置通道（以 OpenClaw 文档为准）。

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-04-02 | 初稿：汇总阶段 0 已完成项与目录约定 |
| 0.2 | 2026-04-02 | 标记阶段 0 完成；OpenAI 兼容 API 已配置并冒烟 |
