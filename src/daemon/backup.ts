/**
 * EmberClaw Backup Manager
 * Memory and config backup with rotation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { BackupConfig, BackupManifest } from './types.js';
import { Logger } from './logger.js';

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  backupDir: '.emberclaw/backups',
  schedule: {
    incremental: '0 * * * *',   // Every hour
    full: '0 0 * * 0',          // Every Sunday at midnight
  },
  retention: {
    incremental: 7,   // 7 days
    full: 30,         // 30 days
  },
  includeSessions: false,
};

const BACKUP_FILES = [
  'SOUL.md',
  'AGENTS.md',
  'config/agents/*.jsonc',
  '.emberclaw/state.json',
];

export class BackupManager {
  private config: BackupConfig;
  private logger: Logger;
  private workspaceRoot: string;

  constructor(logger: Logger, workspaceRoot: string = '.', config: Partial<BackupConfig> = {}) {
    this.logger = logger;
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    const backupDir = path.resolve(this.config.backupDir);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }

  async createBackup(type: 'incremental' | 'full' = 'incremental'): Promise<BackupManifest> {
    if (!this.config.enabled) {
      throw new Error('Backup is disabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${type}-${timestamp}`;
    const backupDir = path.join(this.config.backupDir, backupId);

    this.logger.info(`Creating ${type} backup`, { id: backupId });

    try {
      fs.mkdirSync(backupDir, { recursive: true });

      const files = this.collectFiles(type);
      const backedUpFiles: string[] = [];
      let totalSize = 0;

      for (const file of files) {
        const srcPath = path.join(this.workspaceRoot, file);
        if (!fs.existsSync(srcPath)) continue;

        const destPath = path.join(backupDir, file);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(srcPath, destPath);
        backedUpFiles.push(file);
        totalSize += fs.statSync(destPath).size;
      }

      // Create manifest
      const manifest: BackupManifest = {
        id: backupId,
        type,
        createdAt: new Date().toISOString(),
        files: backedUpFiles,
        size: totalSize,
        checksum: await this.calculateChecksum(backupDir, backedUpFiles),
      };

      // Write manifest
      fs.writeFileSync(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      this.logger.info(`Backup completed`, { 
        id: backupId, 
        files: backedUpFiles.length, 
        size: this.formatBytes(totalSize) 
      });

      // Cleanup old backups
      await this.cleanupOldBackups(type);

      return manifest;
    } catch (error) {
      this.logger.error(`Backup failed`, { id: backupId, error: String(error) });
      
      // Cleanup failed backup
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
      
      throw error;
    }
  }

  private collectFiles(type: 'incremental' | 'full'): string[] {
    const files: string[] = [];

    for (const pattern of BACKUP_FILES) {
      if (pattern.includes('*')) {
        // Handle glob patterns
        const dir = path.dirname(pattern);
        const filePattern = path.basename(pattern);
        const dirPath = path.join(this.workspaceRoot, dir);

        if (fs.existsSync(dirPath)) {
          const dirFiles = fs.readdirSync(dirPath);
          for (const file of dirFiles) {
            if (this.matchPattern(file, filePattern)) {
              files.push(path.join(dir, file));
            }
          }
        }
      } else {
        files.push(pattern);
      }
    }

    // Add sessions for full backup if enabled
    if (type === 'full' && this.config.includeSessions) {
      const sessionsDir = path.join(this.workspaceRoot, '.emberclaw/sessions');
      if (fs.existsSync(sessionsDir)) {
        const sessions = fs.readdirSync(sessionsDir);
        for (const session of sessions) {
          files.push(path.join('.emberclaw/sessions', session));
        }
      }
    }

    return files;
  }

  private matchPattern(filename: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(filename);
  }

  private async calculateChecksum(backupDir: string, files: string[]): Promise<string> {
    const hash = crypto.createHash('sha256');
    
    for (const file of files.sort()) {
      const filePath = path.join(backupDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        hash.update(file);
        hash.update(content);
      }
    }

    return hash.digest('hex');
  }

  private async cleanupOldBackups(type: 'incremental' | 'full'): Promise<void> {
    const backupDir = path.resolve(this.config.backupDir);
    if (!fs.existsSync(backupDir)) return;

    const retention = type === 'incremental' 
      ? this.config.retention.incremental 
      : this.config.retention.full;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention);

    const entries = fs.readdirSync(backupDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith(type + '-')) continue;

      const manifestPath = path.join(backupDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const backupDate = new Date(manifest.createdAt);

        if (backupDate < cutoffDate) {
          const dirPath = path.join(backupDir, entry.name);
          fs.rmSync(dirPath, { recursive: true, force: true });
          this.logger.info(`Deleted old backup`, { id: manifest.id, age: this.getAge(backupDate) });
        }
      } catch {
        // Skip invalid manifests
      }
    }
  }

  async restore(backupId: string): Promise<void> {
    const backupDir = path.join(this.config.backupDir, backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Verify checksum
    const currentChecksum = await this.calculateChecksum(backupDir, manifest.files);
    if (currentChecksum !== manifest.checksum) {
      throw new Error('Backup checksum verification failed');
    }

    this.logger.info(`Restoring backup`, { id: backupId, files: manifest.files.length });

    for (const file of manifest.files) {
      const srcPath = path.join(backupDir, file);
      const destPath = path.join(this.workspaceRoot, file);

      if (!fs.existsSync(srcPath)) continue;

      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(srcPath, destPath);
    }

    this.logger.info(`Backup restored`, { id: backupId });
  }

  listBackups(): BackupManifest[] {
    const backupDir = path.resolve(this.config.backupDir);
    if (!fs.existsSync(backupDir)) return [];

    const manifests: BackupManifest[] = [];
    const entries = fs.readdirSync(backupDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(backupDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifests.push(manifest);
      } catch {
        // Skip invalid manifests
      }
    }

    return manifests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private getAge(date: Date): string {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }
}
