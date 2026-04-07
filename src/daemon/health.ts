/**
 * EmberClaw Health Check Server
 * HTTP endpoint for health status
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import type { HealthStatus } from './types.js';
import { Logger } from './logger.js';
import { Monitor } from './monitor.js';

interface HealthServerConfig {
  port: number;
  host: string;
}

const DEFAULT_CONFIG: HealthServerConfig = {
  port: 9876,
  host: '127.0.0.1',
};

export class HealthServer {
  private config: HealthServerConfig;
  private logger: Logger;
  private monitor: Monitor;
  private server: http.Server | null = null;
  private startedAt: Date;
  private version: string;
  private lastTask: HealthStatus['lastTask'] | undefined;

  constructor(
    logger: Logger, 
    monitor: Monitor, 
    config: Partial<HealthServerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
    this.monitor = monitor;
    this.startedAt = new Date();
    this.version = this.getVersion();
  }

  private getVersion(): string {
    try {
      const pkgPath = path.resolve('package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      }
    } catch {
      // Ignore
    }
    return '0.0.0';
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        this.logger.error('Health server error', { error: String(err) });
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info('Health server started', { 
          url: `http://${this.config.host}:${this.config.port}/health` 
        });
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Health server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '/';
    
    // CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url === '/health' || url === '/') {
      await this.handleHealth(res);
    } else if (url === '/metrics') {
      await this.handleMetrics(res);
    } else if (url === '/logs') {
      this.handleLogs(res);
    } else if (url === '/alerts') {
      this.handleAlerts(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private async handleHealth(res: http.ServerResponse): Promise<void> {
    try {
      const status = await this.getHealthStatus();
      const httpStatus = status.status === 'healthy' ? 200 : 
                         status.status === 'degraded' ? 200 : 503;
      
      res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } catch (error) {
      this.logger.error('Health check failed', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'unhealthy', 
        error: String(error) 
      }));
    }
  }

  private async handleMetrics(res: http.ServerResponse): Promise<void> {
    try {
      const metrics = await this.monitor.getSystemMetrics();
      const taskStats = this.monitor.getTaskStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        system: metrics,
        tasks: taskStats,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
      }, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
  }

  private handleLogs(res: http.ServerResponse): void {
    try {
      const logs = this.logger.readRecentLogs(50);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs }, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
  }

  private handleAlerts(res: http.ServerResponse): void {
    const alerts = this.monitor.getAlertHistory();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ alerts }, null, 2));
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    const metrics = await this.monitor.getSystemMetrics();
    const agentStates = this.monitor.getAgentStates();
    
    // Determine overall status
    let status: HealthStatus['status'] = 'healthy';
    
    // Check for unhealthy conditions
    if (metrics.memory > 95 || metrics.cpu > 95) {
      status = 'unhealthy';
    } else if (metrics.memory > 80 || metrics.cpu > 80 || metrics.disk > 90) {
      status = 'degraded';
    }

    // Check for agent errors
    const hasAgentError = Object.values(agentStates).some(a => a.status === 'error');
    if (hasAgentError) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      uptime: this.getUptime(),
      version: this.version,
      startedAt: this.startedAt.toISOString(),
      agents: agentStates,
      lastTask: this.lastTask,
      system: {
        cpuUsage: Math.round(metrics.cpu * 10) / 10,
        memoryUsage: Math.round(metrics.memory * 10) / 10,
        diskUsage: Math.round(metrics.disk * 10) / 10,
      },
    };
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
  }

  // External update methods

  recordTaskCompletion(taskId: string, success: boolean): void {
    this.lastTask = {
      id: taskId,
      completedAt: new Date().toISOString(),
      status: success ? 'success' : 'failure',
    };
    this.monitor.recordTaskResult(success);
  }

  getPort(): number {
    return this.config.port;
  }
}
