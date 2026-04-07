/**
 * EmberClaw Orchestrator
 * 多 Agent 编排系统入口
 */

export * from "./types.js";
export * from "./agent-dispatch.js";
export * from "./workflow.js";
export * from "./communication.js";

import type { Task, TaskResult, AgentDomain } from "./types.js";
import { WorkflowOrchestrator } from "./workflow.js";
import { AgentCommunicator, SteerManager, ResultFileManager } from "./communication.js";
import { inferTaskType, getAgentDisplayName } from "./agent-dispatch.js";

/**
 * EmberClaw 多 Agent 编排器
 * 实现 Planning -> TDD -> Review -> Deploy 工作流
 */
export class EmberClawOrchestrator {
  private workflow: WorkflowOrchestrator;
  private communicator: AgentCommunicator;
  private steerManager: SteerManager;
  private resultFiles: ResultFileManager;

  constructor(workspaceRoot: string = ".") {
    this.workflow = new WorkflowOrchestrator();
    this.communicator = new AgentCommunicator();
    this.steerManager = new SteerManager();
    this.resultFiles = new ResultFileManager(workspaceRoot);
  }

  /**
   * 从任务描述创建任务
   */
  createTask(description: string, id?: string): Task {
    const taskType = inferTaskType(description);
    return {
      id: id ?? `task-${Date.now()}`,
      type: taskType,
      description,
    };
  }

  /**
   * 执行完整工作流
   */
  async execute(tasks: Task[]): Promise<{
    success: boolean;
    results: TaskResult[];
    duration: number;
  }> {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`EmberClaw 多 Agent 编排启动`);
    console.log(`${"=".repeat(50)}\n`);

    // Phase 1: Planning
    const taskGroups = await this.workflow.planning(tasks);

    // Phase 2: TDD (parallel dispatch)
    const results = await this.workflow.tddDispatch(taskGroups, async (options) => {
      // 这里是实际的 spawn 调用点
      // 在真实实现中，这里会调用 OpenClaw 的 sessions_spawn
      console.log(`  [Spawn] ${getAgentDisplayName(options.agentId)}: ${options.task.description}`);

      // 模拟任务执行
      return this.simulateTaskExecution(options.task, options.agentId);
    });

    // Phase 3: Review
    const review = await this.workflow.reviewGate(results);

    // 处理失败任务的 Steer
    if (!review.passed && review.steerActions.length > 0) {
      console.log(`\n[Steer] 处理 ${review.steerActions.length} 个失败任务...`);
      for (const action of review.steerActions) {
        console.log(`  - ${action.type}: ${action.reason}`);
      }
    }

    // Phase 4: Deploy (如果 Review 通过)
    if (review.passed) {
      await this.workflow.deployTrigger(taskGroups, async (agent, agentTasks) => {
        console.log(`  [Deploy] ${getAgentDisplayName(agent)}: ${agentTasks.length} 个任务`);
        return true; // 模拟部署成功
      });
    }

    const duration = this.workflow.getDuration();
    const success = review.passed;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`工作流完成: ${success ? "✓ 成功" : "✗ 失败"}`);
    console.log(`总耗时: ${(duration / 1000).toFixed(2)}s`);
    console.log(`${"=".repeat(50)}\n`);

    return { success, results, duration };
  }

  /**
   * 模拟任务执行（用于测试）
   */
  private async simulateTaskExecution(task: Task, agentId: AgentDomain): Promise<TaskResult> {
    // 模拟执行时间
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      taskId: task.id,
      agentId,
      status: "success",
      output: `Task ${task.id} completed by ${agentId}`,
      duration: 100,
    };
  }

  /**
   * 获取通信器
   */
  getCommunicator(): AgentCommunicator {
    return this.communicator;
  }

  /**
   * 获取结果文件管理器
   */
  getResultFiles(): ResultFileManager {
    return this.resultFiles;
  }

  /**
   * 获取当前工作流状态
   */
  getState() {
    return this.workflow.getState();
  }
}
