/**
 * EmberClaw System Monitor
 * Resource monitoring and alerting
 */

import * as os from 'os';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import type { MonitorConfig, AlertEvent, AgentHealth, AgentStatus } from './types.js';
import { Logger } from './logger.js';

const DEFAULT_CONFIG: MonitorConfig = {
  checkInterval: 60000, // 1 minute
  thresholds: {
    cpu: 80,
    memory: 90,
    disk: 95,
    taskFailureRate: 10,
  },
};

interface TaskStats {
  total: number;
  failed: number;
  succeeded: number;
}

export class Monitor {
  private config: MonitorConfig;
  private logger: Logger;
  private intervalId: NodeJS.Timeout | null = null;
  private agentStates: Map<string, AgentHealth> = new Map();
  private taskStats: TaskStats = { total: 0, failed: 0, succeeded: 0 };
  private alertHistory: AlertEvent[] = [];

  constructor(logger: Logger, config: Partial<MonitorConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize default agent states
    for (const agent of ['embedded', 'gateway', 'app', 'web']) {
      this.agentStates.set(agent, { status: 'idle' });
    }
  }

  start(): void {
    if (this.intervalId) return;

    this.logger.info('Monitor started', { interval: this.config.checkInterval });
    this.check(); // Initial check
    this.intervalId = setInterval(() => this.check(), this.config.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('Monitor stopped');
    }
  }

  async check(): Promise<void> {
    try {
      const cpu = await this.getCpuUsage();
      const memory = this.getMemoryUsage();
      const disk = await this.getDiskUsage();
      const failureRate = this.getTaskFailureRate();

      this.logger.debug('System metrics', { cpu, memory, disk, failureRate });

      // Check thresholds and alert
      if (cpu > this.config.thresholds.cpu) {
        this.alert({
          type: 'cpu',
          severity: cpu > 95 ? 'critical' : 'warning',
          message: `CPU usage is high: ${cpu.toFixed(1)}%`,
          value: cpu,
          threshold: this.config.thresholds.cpu,
          timestamp: new Date().toISOString(),
        });
      }

      if (memory > this.config.thresholds.memory) {
        this.alert({
          type: 'memory',
          severity: memory > 95 ? 'critical' : 'warning',
          message: `Memory usage is high: ${memory.toFixed(1)}%`,
          value: memory,
          threshold: this.config.thresholds.memory,
          timestamp: new Date().toISOString(),
        });
      }

      if (disk > this.config.thresholds.disk) {
        this.alert({
          type: 'disk',
          severity: disk > 98 ? 'critical' : 'warning',
          message: `Disk usage is high: ${disk.toFixed(1)}%`,
          value: disk,
          threshold: this.config.thresholds.disk,
          timestamp: new Date().toISOString(),
        });
      }

      if (failureRate > this.config.thresholds.taskFailureRate) {
        this.alert({
          type: 'task_failure',
          severity: failureRate > 25 ? 'critical' : 'warning',
          message: `Task failure rate is high: ${failureRate.toFixed(1)}%`,
          value: failureRate,
          threshold: this.config.thresholds.taskFailureRate,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Monitor check failed', { error: String(error) });
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus1 = os.cpus();
      
      setTimeout(() => {
        const cpus2 = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (let i = 0; i < cpus1.length; i++) {
          const cpu1 = cpus1[i];
          const cpu2 = cpus2[i];

          const idle1 = cpu1.times.idle;
          const idle2 = cpu2.times.idle;
          const total1 = Object.values(cpu1.times).reduce((a, b) => a + b, 0);
          const total2 = Object.values(cpu2.times).reduce((a, b) => a + b, 0);

          totalIdle += idle2 - idle1;
          totalTick += total2 - total1;
        }

        const usage = totalTick > 0 ? 100 - (totalIdle / totalTick) * 100 : 0;
        resolve(Math.max(0, Math.min(100, usage)));
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
  }

  private async getDiskUsage(): Promise<number> {
    return new Promise((resolve) => {
      const platform = os.platform();
      
      if (platform === 'win32') {
        // Windows: use wmic
        try {
          const result = childProcess.execSync('wmic logicaldisk get size,freespace', { encoding: 'utf8' });
          const lines = result.trim().split('\n').slice(1);
          let totalSize = 0;
          let totalFree = 0;
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              totalFree += parseInt(parts[0]) || 0;
              totalSize += parseInt(parts[1]) || 0;
            }
          }
          
          resolve(totalSize > 0 ? ((totalSize - totalFree) / totalSize) * 100 : 0);
        } catch {
          resolve(0);
        }
      } else {
        // Unix: use df
        try {
          const result = childProcess.execSync('df -k / | tail -1', { encoding: 'utf8' });
          const parts = result.trim().split(/\s+/);
          const usedPercent = parts[4]?.replace('%', '');
          resolve(parseFloat(usedPercent) || 0);
        } catch {
          resolve(0);
        }
      }
    });
  }

  private getTaskFailureRate(): number {
    if (this.taskStats.total === 0) return 0;
    return (this.taskStats.failed / this.taskStats.total) * 100;
  }

  private alert(event: AlertEvent): void {
    // Avoid duplicate alerts within 5 minutes
    const recentSimilar = this.alertHistory.find(
      a => a.type === event.type && 
           new Date(a.timestamp).getTime() > Date.now() - 5 * 60 * 1000
    );

    if (recentSimilar) return;

    this.alertHistory.push(event);
    
    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    if (event.severity === 'critical') {
      this.logger.error(event.message, { type: event.type, value: event.value, threshold: event.threshold });
    } else {
      this.logger.warn(event.message, { type: event.type, value: event.value, threshold: event.threshold });
    }

    // Send webhook if configured
    if (this.config.alertWebhook) {
      this.sendWebhook(event).catch(err => {
        this.logger.error('Failed to send alert webhook', { error: String(err) });
      });
    }
  }

  private async sendWebhook(event: AlertEvent): Promise<void> {
    if (!this.config.alertWebhook) return;

    const response = await fetch(this.config.alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        source: 'emberclaw',
        hostname: os.hostname(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  // Public methods for external updates

  updateAgentStatus(agentId: string, status: AgentStatus, task?: string): void {
    const health: AgentHealth = {
      status,
      lastActivity: new Date().toISOString(),
      currentTask: task,
    };
    this.agentStates.set(agentId, health);
    this.logger.debug(`Agent ${agentId} status updated`, { status, task });
  }

  recordTaskResult(success: boolean): void {
    this.taskStats.total++;
    if (success) {
      this.taskStats.succeeded++;
    } else {
      this.taskStats.failed++;
    }
  }

  getAgentStates(): Record<string, AgentHealth> {
    return Object.fromEntries(this.agentStates);
  }

  getTaskStats(): TaskStats {
    return { ...this.taskStats };
  }

  getAlertHistory(): AlertEvent[] {
    return [...this.alertHistory];
  }

  async getSystemMetrics(): Promise<{ cpu: number; memory: number; disk: number }> {
    return {
      cpu: await this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
    };
  }
}
