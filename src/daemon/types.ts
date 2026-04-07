/**
 * EmberClaw Daemon Types
 * Core type definitions for daemon modules
 */

// =============================================================================
// Log Types
// =============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  level: LogLevel;
  outputDir: string;
  maxFileSize: number;    // bytes
  maxFiles: number;       // rotation count
  console: boolean;       // also output to console
}

// =============================================================================
// Health Types
// =============================================================================

export type AgentStatus = 'idle' | 'running' | 'error' | 'disabled';

export interface AgentHealth {
  status: AgentStatus;
  lastActivity?: string;
  currentTask?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;         // seconds
  version: string;
  startedAt: string;
  agents: Record<string, AgentHealth>;
  lastTask?: {
    id: string;
    completedAt: string;
    status: 'success' | 'failure';
  };
  system: {
    cpuUsage: number;     // percentage
    memoryUsage: number;  // percentage
    diskUsage: number;    // percentage
  };
}

// =============================================================================
// Monitor Types
// =============================================================================

export interface MonitorConfig {
  checkInterval: number;  // ms
  thresholds: {
    cpu: number;          // percentage
    memory: number;       // percentage
    disk: number;         // percentage
    taskFailureRate: number; // percentage
  };
  alertWebhook?: string;
}

export interface AlertEvent {
  type: 'cpu' | 'memory' | 'disk' | 'task_failure' | 'agent_error';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

// =============================================================================
// Backup Types
// =============================================================================

export interface BackupConfig {
  enabled: boolean;
  backupDir: string;
  schedule: {
    incremental: string;  // cron expression
    full: string;         // cron expression
  };
  retention: {
    incremental: number;  // days
    full: number;         // days
  };
  includeSessions: boolean;
}

export interface BackupManifest {
  id: string;
  type: 'incremental' | 'full';
  createdAt: string;
  files: string[];
  size: number;           // bytes
  checksum: string;       // SHA256
}

// =============================================================================
// Update Types
// =============================================================================

export interface UpdateConfig {
  enabled: boolean;
  checkInterval: number;  // ms (default: 6 hours)
  autoApply: boolean;
  channel: 'stable' | 'beta';
  verifySignature: boolean;
}

export interface VersionInfo {
  current: string;
  latest: string;
  latestUrl: string;
  releaseNotes: string;
  publishedAt: string;
  checksum: string;
}

export interface UpdateResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  error?: string;
  rolledBack?: boolean;
}

// =============================================================================
// Daemon Types
// =============================================================================

export interface DaemonConfig {
  logger: LoggerConfig;
  monitor: MonitorConfig;
  backup: BackupConfig;
  update: UpdateConfig;
  healthPort: number;
}

export interface DaemonState {
  running: boolean;
  startedAt: string;
  pid: number;
  configPath: string;
}
