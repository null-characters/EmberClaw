/**
 * EmberClaw Structured Logger
 * JSONL format with log rotation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LogLevel, LogEntry, LoggerConfig } from './types.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  outputDir: '.emberclaw/logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  console: true,
};

export class Logger {
  private config: LoggerConfig;
  private currentFile: string = '';
  private currentSize: number = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
    this.rotateIfNeeded();
  }

  private ensureLogDir(): void {
    const logDir = path.resolve(this.config.outputDir);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return `emberclaw-${date}.log`;
  }

  private rotateIfNeeded(): void {
    const logDir = path.resolve(this.config.outputDir);
    const logFile = path.join(logDir, this.getLogFileName());

    if (this.currentFile !== logFile) {
      this.closeStream();
      this.currentFile = logFile;
      this.currentSize = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
    }

    if (this.currentSize >= this.config.maxFileSize) {
      this.rotateFile();
    }

    if (!this.writeStream) {
      this.writeStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    }
  }

  private rotateFile(): void {
    this.closeStream();
    const logDir = path.resolve(this.config.outputDir);
    
    // Rotate existing files
    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${this.currentFile}.${i}`;
      const newFile = `${this.currentFile}.${i + 1}`;
      if (fs.existsSync(oldFile)) {
        if (i + 1 >= this.config.maxFiles) {
          fs.unlinkSync(oldFile);
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Rotate current file
    if (fs.existsSync(this.currentFile)) {
      fs.renameSync(this.currentFile, `${this.currentFile}.1`);
    }

    this.currentSize = 0;
  }

  private closeStream(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.config.level];
  }

  private formatEntry(level: LogLevel, msg: string, meta?: Record<string, unknown>): LogEntry {
    return {
      ts: new Date().toISOString(),
      level,
      msg,
      ...meta,
    };
  }

  private write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    const bytes = Buffer.byteLength(line, 'utf8');

    this.rotateIfNeeded();
    
    if (this.writeStream) {
      this.writeStream.write(line);
      this.currentSize += bytes;
    }

    if (this.config.console) {
      const color = this.getColor(entry.level);
      const prefix = `[${entry.ts}] ${color}${entry.level.toUpperCase()}\x1b[0m`;
      console.log(`${prefix} ${entry.msg}`, entry.level === 'debug' ? entry : '');
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'error': return '\x1b[31m'; // red
      case 'warn': return '\x1b[33m';  // yellow
      case 'info': return '\x1b[36m';  // cyan
      case 'debug': return '\x1b[90m'; // gray
      default: return '\x1b[0m';
    }
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.write(this.formatEntry('error', msg, meta));
    }
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.write(this.formatEntry('warn', msg, meta));
    }
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.write(this.formatEntry('info', msg, meta));
    }
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.write(this.formatEntry('debug', msg, meta));
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level changed to ${level}`);
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  close(): void {
    this.closeStream();
  }

  getLogFiles(): string[] {
    const logDir = path.resolve(this.config.outputDir);
    if (!fs.existsSync(logDir)) return [];
    
    return fs.readdirSync(logDir)
      .filter(f => f.startsWith('emberclaw-') && f.endsWith('.log'))
      .map(f => path.join(logDir, f))
      .sort()
      .reverse();
  }

  readRecentLogs(count: number = 100): LogEntry[] {
    const files = this.getLogFiles();
    const entries: LogEntry[] = [];
    
    for (const file of files) {
      if (entries.length >= count) break;
      
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      for (let i = lines.length - 1; i >= 0 && entries.length < count; i--) {
        try {
          entries.unshift(JSON.parse(lines[i]));
        } catch {
          // Skip malformed lines
        }
      }
    }

    return entries.slice(-count);
  }
}

// Singleton instance
let globalLogger: Logger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
