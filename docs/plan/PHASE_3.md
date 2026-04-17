# 阶段 3 进度记录：三端开发 MCP 集成

**阶段目标：** 聚焦 nRF52840 / iOS / Android 三端开发，接入对应工具链

**开始日期：** 2026-04-07

---

## OpenClaw 集成机制调研结论

### 架构发现

OpenClaw 工具集成采用双层结构：

- Extensions (`openclaw/extensions/`) — Provider/模型插件，用 `openclaw.plugin.json` 声明
- Skills (`openclaw/skills/`) — Agent 技能文档，用 SKILL.md + metadata 声明，引导 agent 使用 CLI 工具

### 关键结论

1. Skills 不是 MCP server — 它们是 SKILL.md 文档，引导 agent 使用系统 CLI 工具
2. mcporter — 通用 MCP 桥接 CLI，可调用任意 MCP server
3. 实际工具调用 — 通过 SKILL.md 指导 agent 使用 xcodebuild、./gradlew、west 等 CLI
4. OpenClaw 已有 Android/iOS 应用 — `openclaw/apps/` 下有原生 app 代码

### 集成方式确定

每个 skill 的结构：

```
skills/<name>/
├── SKILL.md        # 技能文档（触发条件 + 命令参考）
└── tools.md        # （可选）详细命令速查
```

SKILL.md 中的 metadata 块声明依赖 bins。

---

## 任务清单

### 3.1 当前范围（三端开发）

- [x] GitHub Skill — gh CLI 集成
- [x] Xcode Build Skill — xcodebuild/xcrun 集成
- [x] Android Build Skill — gradlew/adb 集成
- [x] nRF Connect SDK Skill — west/nrfjprog 集成
- [x] Docker CI Skill — docker CLI 集成
- [ ] 权限沙箱 — 安全隔离（可后置）

### 3.2 延迟功能（记录原因）

| 功能 | 延迟原因 | 计划阶段 |
|------|---------|---------|
| Serial MCP | 当前三端通过 BLE/USB 调试；串口用于网关与嵌入式板间通信，待网关开发阶段再集成 | 阶段 4+ |
| SSH MCP | 当前无远程设备（树莓派网关）需操作；待网关部署阶段再添加 | 阶段 4+ |
| Database MCP | 当前三端不涉及数据库；网关服务端数据层需独立设计，放到网关开发时统一规划 | 阶段 4+ |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-04-07 | v0.1.0 | OpenClaw 集成机制调研完成；确定 skill 集成方案；创建进度文件 |