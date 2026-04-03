# 阶段 2：技能迁移 — 进度记录

> 对应总规划：[PROJECT_PLAN.md](./PROJECT_PLAN.md)「阶段 2」
> 上一阶段：[PHASE_1.md](./PHASE_1.md)
> 最后更新：**2026-04-03**

---

## 目标

迁移现有技能并开发 IoT 专属 skills，形成完整的 `skills/` 目录，扩充 `AGENTS.md` 项目上下文，创建 `SOUL.md` 长期记忆。

---

## 任务清单

| 任务 | 状态 | 说明 |
|------|------|------|
| 整理 AGENTS.md + 创建 SOUL.md | ✅ | AGENTS.md 扩充了技能系统、CLI 用法、目录映射；SOUL.md 记录核心决策 |
| 迁移 nordic-nrf 技能 | ✅ | 从 `~/.cursor/skills/nordic-nrf/` 迁移至 `skills/nordic-nrf/SKILL.md` |
| 开发 nordic-mesh 技能 | ✅ | `skills/nordic-mesh/SKILL.md` — Mesh Provisioning、模型、配置 |
| 开发 power-control 技能 | ✅ | `skills/power-control/SKILL.md` — Buck/Boost 拓扑、PID、PWM |
| 开发 rpi-gateway 技能 | ✅ | `skills/rpi-gateway/SKILL.md` — RPi 网关部署、BLE/Zigbee/MQTT |
| 开发 ios-dev 技能 | ✅ | `skills/ios-dev/SKILL.md` — SwiftUI + CoreBluetooth IoT 伴侣 App |
| 开发 android-dev 技能 | ✅ | `skills/android-dev/SKILL.md` — Jetpack Compose + BLE IoT 伴侣 App |
| 开发 embedded-testing 技能 | ✅ | `skills/embedded-testing/SKILL.md` — Unity 单测、Zephyr ztest、HIL、CI |

### 调整说明

- **Superpowers**: 上游 openclaw 中无独立可迁移的 superpowers skills（仅测试 fixture 引用），已取消此项。
- **Drift**: 上游 openclaw 中的 "drift" 指 npm 完整性漂移检测（安全特性），非代码一致性检查技能，已取消此项。

---

## Skills 目录结构

```
skills/
├── nordic-nrf/        SKILL.md  — nRF5x/nRF Connect SDK 专家
├── nordic-mesh/       SKILL.md  — nRF Mesh 开发
├── power-control/     SKILL.md  — 开关电源控制
├── rpi-gateway/       SKILL.md  — 树莓派网关
├── ios-dev/           SKILL.md  — iOS / SwiftUI
├── android-dev/       SKILL.md  — Android / Compose
└── embedded-testing/  SKILL.md  — 嵌入式测试
```

---

## 引擎契约（不变）

| 项 | 约定 |
|----|------|
| 包 / 二进制 | workspace 包 `rusty-claude-cli`，可执行文件名 **`claw`** |
| 构建 | `cargo build --release -p rusty-claude-cli --manifest-path claw-engine/claw-code-parity/rust/Cargo.toml` |

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-04-03 | 建文档，阶段 2 启动；创建 7 个 IoT 专属 skills + AGENTS.md 扩充 + SOUL.md |
