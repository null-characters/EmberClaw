/**
 * EmberClaw Workflow Orchestration
 * 实现 Planning -> TDD -> Review -> Deploy 工作流
 */

import type {
  Task,
  TaskResult,
  WorkflowStage,
  WorkflowState,
  AgentDomain,
  SteerAction,
} from "./types.js";
import {
  groupTasksByAgent,
  canRunInParallel,
  createSpawnOptions,
  getAgentDisplayName,
} from "./agent-dispatch.js";

/**
 * 工作流编排器
 */
export class WorkflowOrchestrator {
  private state: WorkflowState;
  private readonly maxConcurrent: number = 4;

  constructor() {
    this.state = {
      stage: "planning",
      tasks: [],
      results: [],
      startTime: Date.now(),
    };
  }

  /**
   * Planning 阶段：分析任务并分配给 Agent
   */
  async planning(tasks: Task[]): Promise<Map<AgentDomain, Task[]>> {
    this.state.stage = "planning";
    this.state.tasks = tasks;

    console.log(`[Planning] 分析 ${tasks.length} 个任务...`);

    const taskGroups = groupTasksByAgent(tasks);

    for (const [agent, agentTasks] of taskGroups) {
      console.log(`  - ${getAgentDisplayName(agent)}: ${agentTasks.length} 个任务`);
    }

    return taskGroups;
  }

  /**
   * TDD 阶段：并行分发任务到各 Agent
   * 使用 sessions_spawn 模式
   */
  async tddDispatch(
    taskGroups: Map<AgentDomain, Task[]>,
    spawnFn: (options: ReturnType<typeof createSpawnOptions>) => Promise<TaskResult>
  ): Promise<TaskResult[]> {
    this.state.stage = "tdd";
    const results: TaskResult[] = [];

    console.log(`[TDD] 开始并行分发任务...`);

    // Collect all tasks that can run in parallel
    const allTasks: Task[] = [];
    for (const tasks of taskGroups.values()) {
      allTasks.push(...tasks);
    }

    // Check if tasks can run in parallel
    if (canRunInParallel(allTasks)) {
      console.log(`  - 并行模式: ${allTasks.length} 个任务`);
      const promises = allTasks.map((task) => {
        const options = createSpawnOptions(task, "run");
        return spawnFn(options);
      });

      // Limit concurrency
      const chunks = this.chunkArray(promises, this.maxConcurrent);
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk);
        results.push(...chunkResults);
      }
    } else {
      console.log(`  - 串行模式: 任务间存在依赖`);
      for (const task of this.topologicalSort(allTasks)) {
        const options = createSpawnOptions(task, "run");
        const result = await spawnFn(options);
        results.push(result);

        if (result.status === "failure") {
          console.log(`  - 任务 ${task.id} 失败，检查是否需要 steer...`);
        }
      }
    }

    this.state.results = results;
    return results;
  }

  /**
   * Review 阶段：汇总结果并进行质量检查
   */
  async reviewGate(results: TaskResult[]): Promise<{
    passed: boolean;
    failures: TaskResult[];
    steerActions: SteerAction[];
  }> {
    this.state.stage = "review";
    console.log(`[Review] 检查 ${results.length} 个任务结果...`);

    const failures = results.filter((r) => r.status === "failure");
    const steerActions: SteerAction[] = [];

    if (failures.length > 0) {
      console.log(`  - 发现 ${failures.length} 个失败任务`);

      for (const failure of failures) {
        // 生成 steer 操作建议
        const action = this.generateSteerAction(failure);
        if (action) {
          steerActions.push(action);
        }
      }
    }

    const passed = failures.length === 0;
    console.log(`  - Review ${passed ? "通过" : "未通过"}`);

    return { passed, failures, steerActions };
  }

  /**
   * Deploy 阶段：执行构建/烧录/部署
   */
  async deployTrigger(
    taskGroups: Map<AgentDomain, Task[]>,
    deployFn: (agent: AgentDomain, tasks: Task[]) => Promise<boolean>
  ): Promise<Map<AgentDomain, boolean>> {
    this.state.stage = "deploy";
    console.log(`[Deploy] 开始部署...`);

    const deployResults = new Map<AgentDomain, boolean>();

    for (const [agent, tasks] of taskGroups) {
      console.log(`  - 部署到 ${getAgentDisplayName(agent)}...`);
      const success = await deployFn(agent, tasks);
      deployResults.set(agent, success);
      console.log(`    ${success ? "✓" : "✗"} ${getAgentDisplayName(agent)}`);
    }

    this.state.endTime = Date.now();
    return deployResults;
  }

  /**
   * 生成 Steer 操作
   */
  private generateSteerAction(failure: TaskResult): SteerAction | null {
    // 分析失败原因，决定是重试还是中止
    if (failure.error?.includes("timeout")) {
      return {
        type: "retry",
        reason: "任务超时，尝试重试",
      };
    }

    if (failure.error?.includes("connection")) {
      return {
        type: "retry",
        reason: "连接问题，尝试重试",
      };
    }

    return {
      type: "abort",
      reason: failure.error ?? "未知错误",
    };
  }

  /**
   * 拓扑排序：按依赖关系排序任务
   */
  private topologicalSort(tasks: Task[]): Task[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const result: Task[] = [];

    const visit = (task: Task) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      for (const depId of task.dependencies ?? []) {
        const dep = taskMap.get(depId);
        if (dep) visit(dep);
      }

      result.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return result;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 获取当前工作流状态
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * 获取工作流执行时间
   */
  getDuration(): number {
    const endTime = this.state.endTime ?? Date.now();
    return endTime - this.state.startTime;
  }
}
