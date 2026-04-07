/**
 * EmberClaw Agent Communication
 * Agent 间通信机制实现
 */

import type { AgentMessage, TaskResult, AgentDomain, SteerAction } from "./types.js";

/** 消息队列类型 */
type MessageQueue = Map<string, AgentMessage[]>;

/**
 * Agent 通信管理器
 * 实现 push-based 通知和结果文件共享
 */
export class AgentCommunicator {
  private messageQueues: MessageQueue = new Map();
  private listeners: Map<string, Array<(msg: AgentMessage) => void>> = new Map();
  private resultFiles: Map<string, string> = new Map();

  /**
   * 注册 Agent 的消息监听器
   */
  subscribe(agentId: string, callback: (msg: AgentMessage) => void): () => void {
    const existing = this.listeners.get(agentId) ?? [];
    existing.push(callback);
    this.listeners.set(agentId, existing);

    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(agentId) ?? [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 发送消息（push-based 通知）
   */
  send(message: AgentMessage): void {
    // 添加到目标 Agent 的消息队列
    const queue = this.messageQueues.get(message.to) ?? [];
    queue.push(message);
    this.messageQueues.set(message.to, queue);

    // 触发监听器
    const listeners = this.listeners.get(message.to) ?? [];
    for (const listener of listeners) {
      try {
        listener(message);
      } catch (error) {
        console.error(`[Communication] 消息处理错误:`, error);
      }
    }

    console.log(`[Communication] ${message.from} -> ${message.to}: ${message.type}`);
  }

  /**
   * 发送任务完成通知
   */
  notifyTaskComplete(fromAgent: string, toAgent: string, result: TaskResult): void {
    this.send({
      from: fromAgent,
      to: toAgent,
      type: result.status === "success" ? "task_complete" : "task_failed",
      payload: result,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送 Steer 操作
   */
  sendSteer(fromAgent: string, toAgent: string, action: SteerAction): void {
    this.send({
      from: fromAgent,
      to: toAgent,
      type: "steer",
      payload: action,
      timestamp: Date.now(),
    });
  }

  /**
   * 共享结果文件
   */
  shareResultFile(fromAgent: string, toAgent: string, filePath: string, content: string): void {
    const fileKey = `${fromAgent}:${filePath}`;
    this.resultFiles.set(fileKey, content);

    this.send({
      from: fromAgent,
      to: toAgent,
      type: "result_file",
      payload: { filePath, fileKey },
      timestamp: Date.now(),
    });
  }

  /**
   * 获取共享的结果文件
   */
  getSharedFile(fileKey: string): string | undefined {
    return this.resultFiles.get(fileKey);
  }

  /**
   * 获取 Agent 的待处理消息
   */
  getPendingMessages(agentId: string): AgentMessage[] {
    return this.messageQueues.get(agentId) ?? [];
  }

  /**
   * 清除已处理的消息
   */
  clearMessages(agentId: string): void {
    this.messageQueues.set(agentId, []);
  }

  /**
   * 等待特定类型的消息
   */
  async waitForMessage(
    agentId: string,
    messageType: AgentMessage["type"],
    timeout: number = 30000
  ): Promise<AgentMessage | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, timeout);

      const unsubscribe = this.subscribe(agentId, (msg) => {
        if (msg.type === messageType) {
          clearTimeout(timer);
          unsubscribe();
          resolve(msg);
        }
      });
    });
  }
}

/**
 * Steer 机制实现
 * 处理失败重试和 Agent 重启
 */
export class SteerManager {
  private readonly maxRetries: number = 3;
  private retryCounters: Map<string, number> = new Map();

  /**
   * 执行 Steer 操作
   */
  async executeSteer(
    action: SteerAction,
    targetAgent: AgentDomain,
    retryFn: () => Promise<TaskResult>
  ): Promise<TaskResult | null> {
    const key = `${targetAgent}:${Date.now()}`;
    const currentRetries = this.retryCounters.get(key) ?? 0;

    switch (action.type) {
      case "retry":
        if (currentRetries < this.maxRetries) {
          this.retryCounters.set(key, currentRetries + 1);
          console.log(`[Steer] 重试 ${targetAgent} (${currentRetries + 1}/${this.maxRetries})`);
          return await retryFn();
        } else {
          console.log(`[Steer] 已达到最大重试次数 (${this.maxRetries})`);
          return null;
        }

      case "abort":
        console.log(`[Steer] 中止 ${targetAgent}: ${action.reason}`);
        return null;

      case "redirect":
        if (action.targetAgentId) {
          console.log(`[Steer] 重定向到 ${action.targetAgentId}`);
          // 重定向逻辑需要在上层实现
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * 重置重试计数器
   */
  resetRetries(key: string): void {
    this.retryCounters.delete(key);
  }

  /**
   * 获取重试次数
   */
  getRetryCount(key: string): number {
    return this.retryCounters.get(key) ?? 0;
  }
}

/**
 * 结果文件共享管理器
 */
export class ResultFileManager {
  private readonly workspaceRoot: string;
  private sharedFiles: Map<string, { path: string; owner: string; content: string }> = new Map();

  constructor(workspaceRoot: string = ".") {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * 注册共享文件
   */
  registerFile(owner: AgentDomain, relativePath: string, content: string): string {
    const fileId = `${owner}:${relativePath}`;
    this.sharedFiles.set(fileId, {
      path: `${this.workspaceRoot}/${relativePath}`,
      owner,
      content,
    });
    console.log(`[ResultFile] ${owner} 注册文件: ${relativePath}`);
    return fileId;
  }

  /**
   * 获取共享文件
   */
  getFile(fileId: string): { path: string; owner: string; content: string } | undefined {
    return this.sharedFiles.get(fileId);
  }

  /**
   * 列出 Agent 的所有共享文件
   */
  listFilesByAgent(owner: AgentDomain): string[] {
    const files: string[] = [];
    for (const [fileId, info] of this.sharedFiles) {
      if (info.owner === owner) {
        files.push(fileId);
      }
    }
    return files;
  }

  /**
   * 清理 Agent 的共享文件
   */
  cleanupByAgent(owner: AgentDomain): void {
    for (const [fileId, info] of this.sharedFiles) {
      if (info.owner === owner) {
        this.sharedFiles.delete(fileId);
      }
    }
  }
}
