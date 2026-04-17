/**
 * EmberClaw Daemon
 * Main daemon module that orchestrates all services
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DaemonConfig, DaemonState } from './types.js';
import { Logger, getLogger } from './logger.js';
import { Monitor } from './monitor.js';
import { HealthServer } from './health.js';
import { BackupManager } from './backup.js';

export * from './types.js';
export { Logger, getLogger, createLogger } from './logger.js';
export { Monitor } from './monitor.js';
export { HealthServer } from './health.js';
export { BackupManager } from './backup.js';
export { Updater } from './updater.js';

const DEFAULT_CONFIG: DaemonConfig = {
  logger: {
    level: 'info',
    outputDir: '.emberclaw/logs',
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 5,
    console: true,
  },
  monitor: {
    checkInterval: 60000,
    thresholds: {
      cpu: 80,
      memory: 90,
      disk: 95,
      taskFailureRate: 10,
    },
  },
  backup: {
    enabled: true,
    backupDir: '.emberclaw/backups',
    schedule: {
      incremental: '0 * * * *',
      full: '0 0 * * 0',
    },
    retention: {
      incremental: 7,
      full: 30,
    },
    includeSessions: false,
  },
  update: {
    enabled: false,
    checkInterval: 6 * 60 * 60 * 1000,
    autoApply: false,
    channel: 'stable',
    verifySignature: true,
  },
  healthPort: 9876,
};

const STATE_FILE = '.emberclaw/daemon.state';

export class EmberClawDaemon {
  private config: DaemonConfig;
  private logger: Logger;
  private monitor: Monitor;
  private healthServer: HealthServer;
  private backupManager: BackupManager;
  private state: DaemonState;
  private backupIntervalId: NodeJS.Timeout | null = null;
  private shuttingDown: boolean = false;

  constructor(config: Partial<DaemonConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.logger = getLogger(this.config.logger);
    this.monitor = new Monitor(this.logger, this.config.monitor);
    this.healthServer = new HealthServer(this.logger, this.monitor, { 
      port: this.config.healthPort 
    });
    this.backupManager = new BackupManager(this.logger, '.', this.config.backup);
    
    this.state = {
      running: false,
      startedAt: new Date().toISOString(),
      pid: process.pid,
      configPath: '',
    };
  }

  private mergeConfig(defaults: DaemonConfig, overrides: Partial<DaemonConfig>): DaemonConfig {
    return {
      ...defaults,
      ...overrides,
      logger: { ...defaults.logger, ...overrides.logger },
      monitor: { ...defaults.monitor, ...overrides.monitor },
      backup: { ...defaults.backup, ...overrides.backup },
      update: { ...defaults.update, ...overrides.update },
    };
  }

  async start(): Promise<void> {
    if (this.state.running) {
      this.logger.warn('Daemon already running');
      return;
    }

    this.logger.info('========================================');
    this.logger.info('EmberClaw Daemon starting...');
    this.logger.info('========================================');

    try {
      // Setup signal handlers
      this.setupSignalHandlers();

      // Start services
      await this.healthServer.start();
      this.monitor.start();

      // Schedule backups
      if (this.config.backup.enabled) {
        this.scheduleBackups();
      }

      // Update state
      this.state.running = true;
      this.state.startedAt = new Date().toISOString();
      this.saveState();

      this.logger.info('Daemon started successfully', {
        pid: process.pid,
        healthEndpoint: `http://127.0.0.1:${this.config.healthPort}/health`,
      });
    } catch (error) {
      this.logger.error('Daemon failed to start', { error: String(error) });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.running || this.shuttingDown) return;

    this.shuttingDown = true;
    this.logger.info('Daemon shutting down...');

    try {
      // Stop backup scheduler
      if (this.backupIntervalId) {
        clearInterval(this.backupIntervalId);
        this.backupIntervalId = null;
      }

      // Stop services
      this.monitor.stop();
      await this.healthServer.stop();

      // Update state
      this.state.running = false;
      this.saveState();

      // Close logger
      this.logger.info('Daemon stopped');
      this.logger.close();
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => {
      this.logger.info('Received SIGHUP, reloading configuration...');
      // Could reload config here if needed
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: String(error), stack: error.stack });
      this.stop().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', { reason: String(reason) });
    });
  }

  private scheduleBackups(): void {
    // Simple hourly backup for now (cron parsing could be added)
    this.backupIntervalId = setInterval(async () => {
      try {
        await this.backupManager.createBackup('incremental');
      } catch (error) {
        this.logger.error('Scheduled backup failed', { error: String(error) });
      }
    }, 60 * 60 * 1000); // 1 hour

    this.logger.info('Backup scheduler started');
  }

  private saveState(): void {
    try {
      const stateDir = path.dirname(STATE_FILE);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logger.error('Failed to save state', { error: String(error) });
    }
  }

  static loadState(): DaemonState | null {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // Public API for integration with orchestrator

  updateAgentStatus(agentId: string, status: 'idle' | 'running' | 'error', task?: string): void {
    this.monitor.updateAgentStatus(agentId, status, task);
  }

  recordTaskCompletion(taskId: string, success: boolean): void {
    this.healthServer.recordTaskCompletion(taskId, success);
  }

  async createBackup(type: 'incremental' | 'full' = 'incremental'): Promise<void> {
    await this.backupManager.createBackup(type);
  }

  getLogger(): Logger {
    return this.logger;
  }

  getHealthPort(): number {
    return this.config.healthPort;
  }

  isRunning(): boolean {
    return this.state.running;
  }
}

// CLI entry point
if (process.argv[1]?.endsWith('daemon/index.ts') || process.argv[1]?.endsWith('daemon/index.js')) {
  const daemon = new EmberClawDaemon();
  
  daemon.start().catch((error) => {
    console.error('Failed to start daemon:', error);
    process.exit(1);
  });
}
