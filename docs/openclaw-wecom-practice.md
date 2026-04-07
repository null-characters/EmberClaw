# OpenClaw × 企业微信：下一步实践指南

本文说明如何在 **OpenClaw Gateway** 侧接入**企业微信（WeCom）**渠道，用于收消息、回消息，以及后续与 [agent-automation-current-state.md](./agent-automation-current-state.md) 中的自动化任务（构建结果通知等）衔接。

**官方插件**：腾讯企业微信团队维护的 [`@wecom/wecom-openclaw-plugin`](https://github.com/WecomTeam/wecom-openclaw-plugin)（社区插件，见 OpenClaw [community plugins](https://docs.openclaw.ai/plugins/community)）。

---

## 1. 先决条件

| 项 | 要求 |
|----|------|
| Node.js | **v22.12+**（与 OpenClaw 一致） |
| OpenClaw | 插件 README 要求 **OpenClaw ≥ 2026.3.28**；若版本较旧，先升级 `openclaw` 子模块或按插件说明对齐 |
| 企业微信侧 | 已创建 **智能机器人（Bot）** 或准备使用 **自建应用 Agent 模式**；从管理后台拿到 **Bot ID / Secret**（Bot 模式）或 **CorpID / AgentId / Token / EncodingAESKey**（Agent 模式） |
| Gateway | 企业微信渠道**依赖 Gateway 常驻**；本地先能跑通 `openclaw gateway run` 或已 `gateway install` + `start` |

**安全**：`secret`、`token`、`encodingAESKey` 只放在本机 `openclaw.json` 或环境变量，**勿提交 Git**。

---

## 2. 推荐路径：Bot 模式（WebSocket，上手最快）

### 2.1 一键安装（官方 CLI）

插件仓库推荐使用专用 CLI 完成安装与部分配置：

```bash
# 建议先进入本仓库的 openclaw 子模块目录，且已 nvm use 22
cd /Users/fengbing/git_prj/ai-agent/openclaw

npx -y @wecom/wecom-openclaw-cli install
# 若失败可重试：npx -y @wecom/wecom-openclaw-cli install --force
```

### 2.2 或：手动安装插件

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

### 2.3 写入配置（二选一）

**交互式**（按提示输入 Bot ID、Secret）：

```bash
openclaw channels add
```

**命令行**（示例键名以插件文档为准）：

```bash
openclaw config set channels.wecom.botId "<YOUR_BOT_ID>"
openclaw config set channels.wecom.secret "<YOUR_BOT_SECRET>"
openclaw config set channels.wecom.enabled true
```

### 2.4 启动 / 重启 Gateway

```bash
openclaw gateway run          # 前台调试
# 或（生产）：openclaw gateway install && openclaw gateway start
openclaw gateway restart      # 若服务已在跑
```

### 2.5 访问控制（生产必做）

默认部分策略可能偏松，建议在确认链路通以后收紧：

| 配置项 | 建议 |
|--------|------|
| `channels.wecom.dmPolicy` | 先用 `pairing`，避免任意人 @ 到 bot 即对话；或 `allowlist` + `allowFrom` |
| `channels.wecom.groupPolicy` | 按需 `allowlist` + `groupAllowFrom`，仅允许指定群 |

具体键名与取值以插件 README 与 `openclaw config --help` 为准。

---

## 3. 备选：Agent 模式（自建应用 + XML 加密回调）

适用于已有**企业自建应用**、需走 **API 接收** 回调的场景：

1. 管理后台创建应用，记录 **CorpID、Secret、AgentId**。  
2. **API 接收** 配置 **URL、Token、EncodingAESKey**；保存前须保证 **公网可访问的 HTTPS** 回调 URL 已由 Gateway/插件正确响应校验（详见 [插件文档](https://github.com/WecomTeam/wecom-openclaw-plugin)）。  
3. 在 `openclaw.json` 中按插件说明填写 Agent 相关字段。

该路径涉及**公网入口与证书**，建议在 Bot 模式跑通后再做。

---

## 4. 验证是否成功

```bash
openclaw gateway status
openclaw gateway probe
openclaw status                 # 若文档支持：渠道健康摘要
```

在企业微信内对机器人发一条测试消息，确认 Gateway 日志无报错且能收到回复。

---

## 5. 与「构建通知 / 自动化」衔接

- **人在群里问 + Agent 答**：由本渠道的 **Gateway + 默认模型（OpenAI 兼容）** 完成，无需单独 webhook。  
- **CI 只推一条固定文案**：除本插件外，也可使用企业微信 **群机器人 Webhook**（在群里添加机器人拿到 URL），在 GitHub Actions / GitLab CI 里 `curl` POST JSON；**不经过 OpenClaw**，适合纯通知。  
- **任务失败需 Kimi 摘要再通知**：在流水线中先调用你们的分析步骤，再将摘要通过 **群机器人 webhook** 或 OpenClaw 提供的 **message 类 CLI**（若已配置目标 chat）发出——具体命令以 `openclaw message --help` 与官方文档为准。

---

## 6. 常见问题

| 现象 | 处理方向 |
|------|----------|
| 插件与 OpenClaw 版本不兼容 | 按插件 README「2026.3.22 兼容说明」升级 OpenClaw 或锁定插件版本 |
| 收不到消息 | 查 Gateway 是否运行、防火墙、企业微信后台回调 URL（Webhook/Agent）是否可达 |
| 任意人可与 Bot 对话 | 收紧 `dmPolicy` / `groupPolicy` / allowlist |

---

## 7. 参考链接

- 插件仓库：<https://github.com/WecomTeam/wecom-openclaw-plugin>  
- 腾讯文档（智能机器人）：<https://open.work.weixin.qq.com/help?doc_id=21657>  
- OpenClaw Gateway：<https://docs.openclaw.ai/cli/gateway>  
- OpenClaw 社区插件列表：`openclaw/docs/plugins/community.md`

---

*执行命令前请在本机确认 `openclaw` 在 PATH 中或使用 `node /path/to/openclaw/openclaw.mjs`；配置路径以 `OPENCLAW_CONFIG_PATH` 或默认 `~/.openclaw/openclaw.json` 为准。*
