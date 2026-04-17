/**
 * EmberClaw Orchestrator Types
 * 定义多 Agent 编排系统的核心类型
 */

/** Agent 领域标识 */
export type AgentDomain = "embedded" | "gateway" | "app" | "web";

/** Agent 配置 */
export interface AgentConfig {
  id: string;
  name: string;
  skills: string[];
  subagents: {
    allowAgents: string[];
  };
  sandbox?: {
    mode: "workspace" | "isolated";
    allowedPaths?: string[];
  };
}

/** 任务类型 */
export type TaskType =
  | "firmware_build"      // 固件编译
  | "firmware_flash"      // 固件烧录
  | "mesh_config"         // Mesh 配置
  | "power_driver"        // 电源驱动
  | "docker_build"        // Docker 构建
  | "ci_pipeline"         // CI 流水线
  | "gateway_deploy"      // 网关部署
  | "ios_build"           // iOS 构建
  | "android_build"       // Android 构建
  | "mobile_test"         // 移动端测试
  | "web_frontend"        // Web 前端
  | "web_backend"         // Web 后端
  | "unknown";

/** 任务定义 */
export interface Task {
  id: string;
  type: TaskType;
  description: string;
  dependencies?: string[];
  priority?: number;
  timeout?: number;
}

/** 子任务执行结果 */
export interface TaskResult {
  taskId: string;
  agentId: AgentDomain;
  status: "success" | "failure" | "timeout" | "cancelled";
  output?: string;
  error?: string;
  duration?: number;
  artifacts?: string[];
}

/** 工作流阶段 */
export type WorkflowStage = "planning" | "tdd" | "review" | "deploy";

/** 工作流状态 */
export interface WorkflowState {
  stage: WorkflowStage;
  tasks: Task[];
  results: TaskResult[];
  startTime: number;
  endTime?: number;
}

/** Spawn 选项 */
export interface SpawnOptions {
  mode: "run" | "session";
  agentId: AgentDomain;
  task: Task;
  pushNotify?: boolean;
  timeout?: number;
}

/** Steer 操作 */
export interface SteerAction {
  type: "retry" | "abort" | "redirect";
  targetAgentId?: AgentDomain;
  reason: string;
}

/** Agent 间通信消息 */
export interface AgentMessage {
  from: string;
  to: string;
  type: "task_complete" | "task_failed" | "steer" | "result_file";
  payload: unknown;
  timestamp: number;
}
