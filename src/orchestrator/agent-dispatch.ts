/**
 * EmberClaw Agent Dispatch Logic
 * 根据任务类型匹配并分发到对应的 Agent
 */

import type { AgentDomain, Task, TaskType, SpawnOptions } from "./types.js";

/** 任务类型到 Agent 领域的映射表 */
const TASK_AGENT_MAP: Record<TaskType, AgentDomain> = {
  // Embedded domain
  firmware_build: "embedded",
  firmware_flash: "embedded",
  mesh_config: "embedded",
  power_driver: "embedded",

  // Gateway domain
  docker_build: "gateway",
  ci_pipeline: "gateway",
  gateway_deploy: "gateway",

  // App domain
  ios_build: "app",
  android_build: "app",
  mobile_test: "app",

  // Web domain (Phase 5)
  web_frontend: "web",
  web_backend: "web",

  // Fallback
  unknown: "embedded",
};

/** 关键词到任务类型的映射 */
const KEYWORD_TASK_MAP: Array<{ keywords: string[]; taskType: TaskType }> = [
  // Embedded
  { keywords: ["nrf", "nordic", "zephyr", "firmware", "固件"], taskType: "firmware_build" },
  { keywords: ["flash", "烧录", "jlink", "nrfjprog"], taskType: "firmware_flash" },
  { keywords: ["mesh", "蓝牙网格", "provisioning"], taskType: "mesh_config" },
  { keywords: ["power", "电源", "驱动", "pwm"], taskType: "power_driver" },

  // Gateway
  { keywords: ["docker", "容器", "镜像"], taskType: "docker_build" },
  { keywords: ["ci", "github actions", "pipeline", "流水线"], taskType: "ci_pipeline" },
  { keywords: ["gateway", "网关", "raspberry", "树莓派", "mqtt"], taskType: "gateway_deploy" },

  // App
  { keywords: ["ios", "iphone", "swift", "xcode", "xcodebuild"], taskType: "ios_build" },
  { keywords: ["android", "gradle", "kotlin", "adb"], taskType: "android_build" },
  { keywords: ["simulator", "模拟器", "emulator", "app test"], taskType: "mobile_test" },

  // Web
  { keywords: ["react", "vue", "next", "frontend", "前端"], taskType: "web_frontend" },
  { keywords: ["api", "backend", "后端", "database", "数据库"], taskType: "web_backend" },
];

/**
 * 从任务描述中推断任务类型
 */
export function inferTaskType(description: string): TaskType {
  const lowerDesc = description.toLowerCase();

  for (const { keywords, taskType } of KEYWORD_TASK_MAP) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return taskType;
      }
    }
  }

  return "unknown";
}

/**
 * 获取任务对应的 Agent 领域
 */
export function getAgentForTask(task: Task): AgentDomain {
  return TASK_AGENT_MAP[task.type];
}

/**
 * 获取任务类型对应的 Agent 领域
 */
export function getAgentForTaskType(taskType: TaskType): AgentDomain {
  return TASK_AGENT_MAP[taskType];
}

/**
 * 分析多个任务，按 Agent 领域分组
 */
export function groupTasksByAgent(tasks: Task[]): Map<AgentDomain, Task[]> {
  const groups = new Map<AgentDomain, Task[]>();

  for (const task of tasks) {
    const agent = getAgentForTask(task);
    const existing = groups.get(agent) ?? [];
    existing.push(task);
    groups.set(agent, existing);
  }

  return groups;
}

/**
 * 检查任务是否可并行执行
 * 不同 Agent 领域的任务默认可以并行
 * 同一 Agent 领域内有依赖关系的任务需要串行
 */
export function canRunInParallel(tasks: Task[]): boolean {
  const agents = new Set(tasks.map((t) => getAgentForTask(t)));

  // Different agents can always run in parallel
  if (agents.size === tasks.length) {
    return true;
  }

  // Check for dependencies within tasks
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    if (task.dependencies?.some((dep) => taskIds.has(dep))) {
      return false;
    }
  }

  return true;
}

/**
 * 创建 Spawn 选项
 */
export function createSpawnOptions(task: Task, mode: "run" | "session" = "run"): SpawnOptions {
  return {
    mode,
    agentId: getAgentForTask(task),
    task,
    pushNotify: true,
    timeout: task.timeout ?? 300000, // Default 5 minutes
  };
}

/**
 * 验证 Agent 可以被 orchestrator spawn
 */
export function canOrchestratorSpawn(agentId: AgentDomain): boolean {
  const allowedAgents: AgentDomain[] = ["embedded", "gateway", "app", "web"];
  return allowedAgents.includes(agentId);
}

/**
 * 获取所有可用的 Agent 领域
 */
export function getAvailableAgents(): AgentDomain[] {
  return ["embedded", "gateway", "app", "web"];
}

/**
 * 获取 Agent 领域的显示名称
 */
export function getAgentDisplayName(agent: AgentDomain): string {
  const names: Record<AgentDomain, string> = {
    embedded: "嵌入式 Agent",
    gateway: "网关 Agent",
    app: "移动端 Agent",
    web: "Web Agent",
  };
  return names[agent];
}
