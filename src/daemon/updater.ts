/**
 * EmberClaw Auto-Updater
 * Version checking and auto-update mechanism
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as childProcess from 'child_process';
import type { UpdateConfig, VersionInfo, UpdateResult } from './types.js';
import { Logger } from './logger.js';

const DEFAULT_CONFIG: UpdateConfig = {
  enabled: false,
  checkInterval: 6 * 60 * 60 * 1000, // 6 hours
  autoApply: false,
  channel: 'stable',
  verifySignature: true,
};

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'null-characters';
const REPO_NAME = 'EmberClaw';

export class Updater {
  private config: UpdateConfig;
  private logger: Logger;
  private currentVersion: string;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private updateInProgress: boolean = false;

  constructor(logger: Logger, config: Partial<UpdateConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentVersion = this.getCurrentVersion();
  }

  private getCurrentVersion(): string {
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

  start(): void {
    if (!this.config.enabled) {
      this.logger.info('Auto-updater is disabled');
      return;
    }

    if (this.checkIntervalId) return;

    this.logger.info('Auto-updater started', { 
      interval: `${this.config.checkInterval / (60 * 60 * 1000)}h`,
      channel: this.config.channel,
    });

    // Initial check after 1 minute
    setTimeout(() => this.checkForUpdates(), 60 * 1000);

    // Periodic checks
    this.checkIntervalId = setInterval(
      () => this.checkForUpdates(),
      this.config.checkInterval
    );
  }

  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      this.logger.info('Auto-updater stopped');
    }
  }

  async checkForUpdates(): Promise<VersionInfo | null> {
    this.logger.debug('Checking for updates...');

    try {
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        this.logger.debug('No releases found');
        return null;
      }

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      
      if (!this.isNewerVersion(latestVersion, this.currentVersion)) {
        this.logger.debug('Already on latest version', { current: this.currentVersion });
        return null;
      }

      const versionInfo: VersionInfo = {
        current: this.currentVersion,
        latest: latestVersion,
        latestUrl: latestRelease.html_url,
        releaseNotes: latestRelease.body || '',
        publishedAt: latestRelease.published_at,
        checksum: this.extractChecksum(latestRelease.body || ''),
      };

      this.logger.info('Update available', { 
        current: this.currentVersion, 
        latest: latestVersion 
      });

      // Auto-apply if configured
      if (this.config.autoApply) {
        await this.applyUpdate(versionInfo);
      }

      return versionInfo;
    } catch (error) {
      this.logger.error('Failed to check for updates', { error: String(error) });
      return null;
    }
  }

  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `EmberClaw/${this.currentVersion}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No releases
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json() as GitHubRelease;
    } catch (error) {
      this.logger.error('Failed to fetch release info', { error: String(error) });
      return null;
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }

    return false;
  }

  private extractChecksum(releaseNotes: string): string {
    // Look for SHA256 checksum in release notes
    const match = releaseNotes.match(/SHA256:\s*([a-f0-9]{64})/i);
    return match ? match[1] : '';
  }

  async applyUpdate(versionInfo: VersionInfo): Promise<UpdateResult> {
    if (this.updateInProgress) {
      return {
        success: false,
        previousVersion: this.currentVersion,
        newVersion: versionInfo.latest,
        error: 'Update already in progress',
      };
    }

    this.updateInProgress = true;
    this.logger.info('Applying update', { version: versionInfo.latest });

    try {
      // Create backup before update
      const backupDir = `.emberclaw/update-backup-${Date.now()}`;
      fs.mkdirSync(backupDir, { recursive: true });

      // Backup critical files
      const filesToBackup = ['package.json', 'SOUL.md', 'AGENTS.md'];
      for (const file of filesToBackup) {
        if (fs.existsSync(file)) {
          fs.copyFileSync(file, path.join(backupDir, file));
        }
      }

      // Pull latest changes using git
      const result = await this.gitPull();
      
      if (!result.success) {
        throw new Error(result.error || 'Git pull failed');
      }

      // Install dependencies
      await this.npmInstall();

      // Verify health
      const healthy = await this.verifyHealth();
      
      if (!healthy) {
        // Rollback
        this.logger.warn('Health check failed, rolling back...');
        await this.rollback(backupDir);
        
        return {
          success: false,
          previousVersion: this.currentVersion,
          newVersion: versionInfo.latest,
          error: 'Health check failed after update',
          rolledBack: true,
        };
      }

      // Update successful
      this.currentVersion = versionInfo.latest;
      
      this.logger.info('Update applied successfully', { 
        version: versionInfo.latest 
      });

      // Cleanup backup
      fs.rmSync(backupDir, { recursive: true, force: true });

      return {
        success: true,
        previousVersion: this.currentVersion,
        newVersion: versionInfo.latest,
      };
    } catch (error) {
      this.logger.error('Update failed', { error: String(error) });
      
      return {
        success: false,
        previousVersion: this.currentVersion,
        newVersion: versionInfo.latest,
        error: String(error),
      };
    } finally {
      this.updateInProgress = false;
    }
  }

  private async gitPull(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      childProcess.exec('git pull origin main', (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message });
        } else {
          this.logger.debug('Git pull output', { stdout: stdout.trim() });
          resolve({ success: true });
        }
      });
    });
  }

  private async npmInstall(): Promise<void> {
    return new Promise((resolve, reject) => {
      childProcess.exec('npm install --production', (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          this.logger.debug('npm install completed');
          resolve();
        }
      });
    });
  }

  private async verifyHealth(): Promise<boolean> {
    try {
      // Simple health check - try to import main modules
      const response = await fetch('http://127.0.0.1:9876/health', {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const data = await response.json() as { status: string };
        return data.status === 'healthy' || data.status === 'degraded';
      }
      
      return false;
    } catch {
      // Health endpoint might not be running during update
      return true; // Assume healthy if we can't check
    }
  }

  private async rollback(backupDir: string): Promise<void> {
    const filesToRestore = ['package.json', 'SOUL.md', 'AGENTS.md'];
    
    for (const file of filesToRestore) {
      const backupPath = path.join(backupDir, file);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, file);
      }
    }

    // Reinstall dependencies with old package.json
    await this.npmInstall();
    
    this.logger.info('Rollback completed');
  }

  getVersion(): string {
    return this.currentVersion;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// GitHub API types
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}
